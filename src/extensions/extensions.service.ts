import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';
import { FreeswitchService } from '../freeswitch/freeswitch.service';

export interface Extension {
  extension_uuid?: string;
  domain_name: string;
  domain_uuid: string;
  extension: string;
  number_alias?: string;
  password?: string;
  accountcode?: string;
  effective_caller_id_name?: string;
  effective_caller_id_number?: string;
  outbound_caller_id_name?: string;
  outbound_caller_id_number?: string;
  emergency_caller_id_name?: string;
  emergency_caller_id_number?: string;
  directory_first_name?: string;
  directory_last_name?: string;
  directory_visible?: string;
  directory_exten_visible?: string;
  limit_max?: number;
  limit_destination?: string;
  voicemail_enabled?: string;
  voicemail_password?: string;
  voicemail_mail_to?: string;
  voicemail_file?: string;
  voicemail_local_after_email?: string;
  user_context?: string;
  missed_call_app?: string;
  missed_call_data?: string;
  enabled?: string;
  description?: string;
  insert_date?: string;
  insert_user?: string;
  update_date?: string;
  update_user?: string;
}

@Injectable()
export class ExtensionsService {
  constructor(
    private databaseService: DatabaseService,
    private freeswitchService: FreeswitchService
  ) {}

  async findAll(domain_uuid: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM v_extensions WHERE domain_uuid = $1 ORDER BY extension',
      [domain_uuid]
    );
    return result.rows;
  }

  async findOne(extension_uuid: string, domain_uuid: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM v_extensions WHERE extension_uuid = $1 AND domain_uuid = $2',
      [extension_uuid, domain_uuid]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Extension with UUID ${extension_uuid} not found`);
    }

    return result.rows[0];
  }

  async create(extension: Extension) {
    const extension_uuid = uuidv4();
    const now = new Date().toISOString();

    // Generate random password if not provided
    const password = extension.password || this.generatePassword();

    // get domain by param domain_name
    const domainsResult = await this.databaseService.query(
      'SELECT domain_uuid, domain_name FROM v_domains WHERE domain_name = $1 LIMIT 1',
      [extension.domain_name]
    );

    let domain_uuid = "";
    if (domainsResult.rows.length > 0) {
      console.log("Dong domain lay ra duoc : ");
      console.log(domainsResult.rows[0]);
      domain_uuid = domainsResult.rows[0].domain_uuid;
    }

    console.log("Domain UUID lay duoc tu domain name la : " + domain_uuid);

    const result = await this.databaseService.query(
      `INSERT INTO v_extensions (
        extension_uuid, domain_uuid, extension, number_alias, password,
        accountcode, effective_caller_id_name, effective_caller_id_number,
        outbound_caller_id_name, outbound_caller_id_number,
        directory_first_name, directory_last_name,
        directory_visible, directory_exten_visible,
        user_context, enabled, description,
        insert_date, insert_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        extension_uuid,
        domain_uuid,
        extension.extension,
        extension.number_alias || '',
        password,
        extension.accountcode || extension.extension,
        extension.effective_caller_id_name || '',
        extension.effective_caller_id_number || extension.extension,
        extension.outbound_caller_id_name || '',
        extension.outbound_caller_id_number || '',
        extension.directory_first_name || '',
        extension.directory_last_name || '',
        extension.directory_visible || 'true',
        extension.directory_exten_visible || 'true',
        //extension.voicemail_enabled || 'true',
        //extension.voicemail_password || this.generateNumericPassword(),
        //extension.voicemail_mail_to || '',
        extension.user_context || extension.domain_name,
        extension.enabled || 'true',
        extension.description || '',
        now,
        extension.insert_user || null,
      ]
    );

    // Reload XML
      try {
        const reloadXml_result = await this.freeswitchService.reloadXml();
        console.log("Create extension - Ket qua reload XML : ");
        console.log(reloadXml_result);
      } catch (error) {
        console.error('Failed to reload XML in FreeSWITCH:', error);
      }

    return result.rows[0];
  }

  async update(extension_uuid: string, domain_uuid: string, extension: Partial<Extension>) {
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Dynamically build update query
    const fields = [
      'extension', 'number_alias', 'password', 'accountcode',
      'effective_caller_id_name', 'effective_caller_id_number',
      'outbound_caller_id_name', 'outbound_caller_id_number',
      'directory_first_name', 'directory_last_name',
      'directory_visible', 'directory_exten_visible',
      'voicemail_enabled', 'voicemail_password', 'voicemail_mail_to',
      'user_context', 'enabled', 'description'
    ];

    for (const field of fields) {
      if (extension[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(extension[field]);
      }
    }

    updates.push(`update_date = $${paramIndex++}`);
    values.push(now);
    updates.push(`update_user = $${paramIndex++}`);
    values.push(extension.update_user || 'api');

    values.push(extension_uuid);
    values.push(domain_uuid);

    const result = await this.databaseService.query(
      `UPDATE v_extensions SET ${updates.join(', ')} 
       WHERE extension_uuid = $${paramIndex} AND domain_uuid = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Extension with UUID ${extension_uuid} not found`);
    }

    return result.rows[0];
  }

  async remove(extension_uuid: string, domain_uuid: string) {
    const result = await this.databaseService.query(
      'DELETE FROM v_extensions WHERE extension_uuid = $1 AND domain_uuid = $2 RETURNING *',
      [extension_uuid, domain_uuid]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Extension with UUID ${extension_uuid} not found`);
    }

    return { deleted: true, extension: result.rows[0] };
  }

  private generatePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  private generateNumericPassword(length: number = 6): string {
    let password = '';
    for (let i = 0; i < length; i++) {
      password += Math.floor(Math.random() * 10);
    }
    return password;
  }
}
