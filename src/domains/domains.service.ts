import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FreeswitchService } from '../freeswitch/freeswitch.service';
import { v4 as uuidv4 } from 'uuid';

export interface Domain {
  domain_uuid?: string;
  domain_name: string;
  domain_enabled?: string;
  domain_description?: string;
  insert_date?: string;
  insert_user?: string;
  update_date?: string;
  update_user?: string;
}

@Injectable()
export class DomainsService {
  constructor(private databaseService: DatabaseService, private freeswitchService: FreeswitchService) {}

  async findAll() {
    const result = await this.databaseService.query(
      'SELECT * FROM v_domains ORDER BY domain_name'
    );
    return result.rows;
  }

  async findOne(domain_uuid: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM v_domains WHERE domain_uuid = $1',
      [domain_uuid]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Domain with UUID ${domain_uuid} not found`);
    }

    return result.rows[0];
  }

  async create(domain: Domain) {
    const domain_uuid = uuidv4();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO v_domains (
        domain_uuid, domain_name, domain_enabled, domain_description,
        insert_date, insert_user
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        domain_uuid,
        domain.domain_name,
        domain.domain_enabled || 'true',
        domain.domain_description || '',
        now,
        domain.insert_user || null,
      ]
    );

    const reloadXml_result = await this.freeswitchService.reloadXml();

    console.log("Ket qua reload XML : ");
    console.log(reloadXml_result);

    return result.rows[0];
  }

  async update(domain_uuid: string, domain: Partial<Domain>) {
    const now = new Date().toISOString();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (domain.domain_name !== undefined) {
      updates.push(`domain_name = $${paramIndex++}`);
      values.push(domain.domain_name);
    }
    if (domain.domain_enabled !== undefined) {
      updates.push(`domain_enabled = $${paramIndex++}`);
      values.push(domain.domain_enabled);
    }
    if (domain.domain_description !== undefined) {
      updates.push(`domain_description = $${paramIndex++}`);
      values.push(domain.domain_description);
    }

    updates.push(`update_date = $${paramIndex++}`);
    values.push(now);
    updates.push(`update_user = $${paramIndex++}`);
    values.push(domain.update_user || 'api');

    values.push(domain_uuid);

    const result = await this.databaseService.query(
      `UPDATE v_domains SET ${updates.join(', ')} 
       WHERE domain_uuid = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Domain with UUID ${domain_uuid} not found`);
    }

    return result.rows[0];
  }

  async remove(domain_uuid: string) {
    const result = await this.databaseService.query(
      'DELETE FROM v_domains WHERE domain_uuid = $1 RETURNING *',
      [domain_uuid]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Domain with UUID ${domain_uuid} not found`);
    }

    return { deleted: true, domain: result.rows[0] };
  }
}
