import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FreeswitchService } from '../freeswitch/freeswitch.service';
import { v4 as uuidv4 } from 'uuid';

export interface Gateway {
  gateway_uuid?: string;
  domain_uuid: string;
  gateway: string;
  username?: string;
  password?: string;
  distinct_to?: string;
  auth_username?: string;
  realm?: string;
  from_user?: string;
  from_domain?: string;
  proxy?: string;
  register_proxy?: string;
  outbound_proxy?: string;
  expire_seconds?: number;
  register?: string;
  register_transport?: string;
  retry_seconds?: number;
  extension?: string;
  ping?: string;
  caller_id_in_from?: string;
  supress_cng?: string;
  sip_cid_type?: string;
  codec_prefs?: string;
  channels?: number;
  extension_in_contact?: string;
  context?: string;
  profile?: string;
  hostname?: string;
  enabled?: string;
  description?: string;
  insert_date?: string;
  insert_user?: string;
  update_date?: string;
  update_user?: string;
}

@Injectable()
export class GatewaysService {
  constructor(
    private databaseService: DatabaseService,
    private freeswitchService: FreeswitchService,
  ) {}

  async findAll(domain_uuid: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM v_gateways WHERE domain_uuid = $1 ORDER BY gateway',
      [domain_uuid]
    );
    return result.rows;
  }

  async findOne(gateway_uuid: string, domain_uuid: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM v_gateways WHERE gateway_uuid = $1 AND domain_uuid = $2',
      [gateway_uuid, domain_uuid]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Gateway with UUID ${gateway_uuid} not found`);
    }

    return result.rows[0];
  }

  async create(gateway: Gateway) {
    const gateway_uuid = uuidv4();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO v_gateways (
        gateway_uuid, domain_uuid, gateway, username, password,
        auth_username, realm, from_user, from_domain,
        proxy, register_proxy, outbound_proxy,
        expire_seconds, register, register_transport,
        retry_seconds, extension, ping,
        caller_id_in_from, sip_cid_type, codec_prefs,
        channels, context, profile, hostname,
        enabled, description, insert_date, insert_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      RETURNING *`,
      [
        gateway_uuid,
        gateway.domain_uuid,
        gateway.gateway,
        gateway.username || '',
        gateway.password || '',
        gateway.auth_username || gateway.username || '',
        gateway.realm || '',
        gateway.from_user || '',
        gateway.from_domain || '',
        gateway.proxy || '',
        gateway.register_proxy || '',
        gateway.outbound_proxy || '',
        gateway.expire_seconds || 600,
        gateway.register || 'true',
        gateway.register_transport || 'udp',
        gateway.retry_seconds || 30,
        gateway.extension || '',
        gateway.ping || '',
        gateway.caller_id_in_from || 'false',
        gateway.sip_cid_type || 'none',
        gateway.codec_prefs || 'PCMU,PCMA',
        gateway.channels || 0,
        gateway.context || 'public',
        gateway.profile || 'external',
        gateway.hostname || '',
        gateway.enabled || 'true',
        gateway.description || '',
        now,
        gateway.insert_user || 'api',
      ]
    );

    // Reload gateway in FreeSWITCH
    try {
      await this.freeswitchService.sofiaProfileRescan(gateway.profile || 'external');
    } catch (error) {
      console.error('Failed to reload gateway in FreeSWITCH:', error);
    }

    return result.rows[0];
  }

  async update(gateway_uuid: string, domain_uuid: string, gateway: Partial<Gateway>) {
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields = [
      'gateway', 'username', 'password', 'auth_username', 'realm',
      'from_user', 'from_domain', 'proxy', 'register_proxy', 'outbound_proxy',
      'expire_seconds', 'register', 'register_transport', 'retry_seconds',
      'extension', 'ping', 'caller_id_in_from', 'sip_cid_type', 'codec_prefs',
      'channels', 'context', 'profile', 'hostname', 'enabled', 'description'
    ];

    for (const field of fields) {
      if (gateway[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(gateway[field]);
      }
    }

    updates.push(`update_date = $${paramIndex++}`);
    values.push(now);
    updates.push(`update_user = $${paramIndex++}`);
    values.push(gateway.update_user || 'api');

    values.push(gateway_uuid);
    values.push(domain_uuid);

    const result = await this.databaseService.query(
      `UPDATE v_gateways SET ${updates.join(', ')} 
       WHERE gateway_uuid = $${paramIndex} AND domain_uuid = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Gateway with UUID ${gateway_uuid} not found`);
    }

    // Reload gateway in FreeSWITCH
    try {
      const profile = gateway.profile || result.rows[0].profile || 'external';
      await this.freeswitchService.sofiaProfileRescan(profile);
    } catch (error) {
      console.error('Failed to reload gateway in FreeSWITCH:', error);
    }

    return result.rows[0];
  }

  async remove(gateway_uuid: string, domain_uuid: string) {
    // Get gateway info before deletion
    const gateway = await this.findOne(gateway_uuid, domain_uuid);
    
    const result = await this.databaseService.query(
      'DELETE FROM v_gateways WHERE gateway_uuid = $1 AND domain_uuid = $2 RETURNING *',
      [gateway_uuid, domain_uuid]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Gateway with UUID ${gateway_uuid} not found`);
    }

    // Kill gateway in FreeSWITCH
    try {
      await this.freeswitchService.reloadGateway(gateway.gateway);
    } catch (error) {
      console.error('Failed to kill gateway in FreeSWITCH:', error);
    }

    return { deleted: true, gateway: result.rows[0] };
  }
}
