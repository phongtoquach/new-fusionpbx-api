import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FreeswitchService } from '../freeswitch/freeswitch.service';
import { v4 as uuidv4 } from 'uuid';

export interface DialplanDetail {
  dialplan_detail_uuid?: string;
  dialplan_uuid?: string;
  domain_uuid?: string;
  dialplan_detail_tag: string;
  dialplan_detail_type: string;
  dialplan_detail_data: string;
  dialplan_detail_break?: string;
  dialplan_detail_inline?: string;
  dialplan_detail_group?: number;
  dialplan_detail_order?: number;
}

export interface Dialplan {
  dialplan_uuid?: string;
  domain_uuid: string;
  dialplan_name: string;
  dialplan_number?: string;
  dialplan_context?: string;
  dialplan_continue?: string;
  dialplan_enabled?: string;
  dialplan_description?: string;
  dialplan_order?: number;
  insert_date?: string;
  insert_user?: string;
  update_date?: string;
  update_user?: string;
  details?: DialplanDetail[];
}

@Injectable()
export class DialplansService {
  constructor(
    private databaseService: DatabaseService,
    private freeswitchService: FreeswitchService,
  ) {}

  async findAll(domain_uuid: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM v_dialplans WHERE domain_uuid = $1 ORDER BY dialplan_order, dialplan_name',
      [domain_uuid]
    );
    return result.rows;
  }

  async findOne(dialplan_uuid: string, domain_uuid: string) {
    const dialplan = await this.databaseService.query(
      'SELECT * FROM v_dialplans WHERE dialplan_uuid = $1 AND domain_uuid = $2',
      [dialplan_uuid, domain_uuid]
    );

    if (dialplan.rows.length === 0) {
      throw new NotFoundException(`Dialplan with UUID ${dialplan_uuid} not found`);
    }

    // Get dialplan details
    const details = await this.databaseService.query(
      `SELECT * FROM v_dialplan_details 
       WHERE dialplan_uuid = $1 AND domain_uuid = $2 
       ORDER BY dialplan_detail_group, dialplan_detail_order`,
      [dialplan_uuid, domain_uuid]
    );

    return {
      ...dialplan.rows[0],
      details: details.rows,
    };
  }

  async create(dialplan: Dialplan) {
    const dialplan_uuid = uuidv4();
    const now = new Date().toISOString();

    return await this.databaseService.transaction(async (client) => {
      // Insert dialplan
      const result = await client.query(
        `INSERT INTO v_dialplans (
          dialplan_uuid, domain_uuid, dialplan_name, dialplan_number,
          dialplan_context, dialplan_continue, dialplan_enabled,
          dialplan_description, dialplan_order,
          insert_date, insert_user
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          dialplan_uuid,
          dialplan.domain_uuid,
          dialplan.dialplan_name,
          dialplan.dialplan_number || '',
          dialplan.dialplan_context || 'default',
          dialplan.dialplan_continue || 'false',
          dialplan.dialplan_enabled || 'true',
          dialplan.dialplan_description || '',
          dialplan.dialplan_order || 100,
          now,
          dialplan.insert_user || 'api',
        ]
      );

      // Insert dialplan details if provided
      if (dialplan.details && dialplan.details.length > 0) {
        for (const detail of dialplan.details) {
          const detail_uuid = uuidv4();
          await client.query(
            `INSERT INTO v_dialplan_details (
              dialplan_detail_uuid, dialplan_uuid, domain_uuid,
              dialplan_detail_tag, dialplan_detail_type, dialplan_detail_data,
              dialplan_detail_break, dialplan_detail_inline,
              dialplan_detail_group, dialplan_detail_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              detail_uuid,
              dialplan_uuid,
              dialplan.domain_uuid,
              detail.dialplan_detail_tag,
              detail.dialplan_detail_type,
              detail.dialplan_detail_data,
              detail.dialplan_detail_break || '',
              detail.dialplan_detail_inline || '',
              detail.dialplan_detail_group || 0,
              detail.dialplan_detail_order || 100,
            ]
          );
        }
      }

      // Reload XML
      try {
        await this.freeswitchService.reloadXml();
      } catch (error) {
        console.error('Failed to reload XML in FreeSWITCH:', error);
      }

      return result.rows[0];
    });
  }

  async update(dialplan_uuid: string, domain_uuid: string, dialplan: Partial<Dialplan>) {
    const now = new Date().toISOString();

    return await this.databaseService.transaction(async (client) => {
      // Update dialplan
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fields = [
        'dialplan_name', 'dialplan_number', 'dialplan_context',
        'dialplan_continue', 'dialplan_enabled', 'dialplan_description', 'dialplan_order'
      ];

      for (const field of fields) {
        if (dialplan[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(dialplan[field]);
        }
      }

      updates.push(`update_date = $${paramIndex++}`);
      values.push(now);
      updates.push(`update_user = $${paramIndex++}`);
      values.push(dialplan.update_user || 'api');

      values.push(dialplan_uuid);
      values.push(domain_uuid);

      const result = await client.query(
        `UPDATE v_dialplans SET ${updates.join(', ')} 
         WHERE dialplan_uuid = $${paramIndex} AND domain_uuid = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Dialplan with UUID ${dialplan_uuid} not found`);
      }

      // Update details if provided
      if (dialplan.details !== undefined) {
        // Delete existing details
        await client.query(
          'DELETE FROM v_dialplan_details WHERE dialplan_uuid = $1 AND domain_uuid = $2',
          [dialplan_uuid, domain_uuid]
        );

        // Insert new details
        for (const detail of dialplan.details) {
          const detail_uuid = uuidv4();
          await client.query(
            `INSERT INTO v_dialplan_details (
              dialplan_detail_uuid, dialplan_uuid, domain_uuid,
              dialplan_detail_tag, dialplan_detail_type, dialplan_detail_data,
              dialplan_detail_break, dialplan_detail_inline,
              dialplan_detail_group, dialplan_detail_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              detail_uuid,
              dialplan_uuid,
              domain_uuid,
              detail.dialplan_detail_tag,
              detail.dialplan_detail_type,
              detail.dialplan_detail_data,
              detail.dialplan_detail_break || '',
              detail.dialplan_detail_inline || '',
              detail.dialplan_detail_group || 0,
              detail.dialplan_detail_order || 100,
            ]
          );
        }
      }

      // Reload XML
      try {
        await this.freeswitchService.reloadXml();
      } catch (error) {
        console.error('Failed to reload XML in FreeSWITCH:', error);
      }

      return result.rows[0];
    });
  }

  async remove(dialplan_uuid: string, domain_uuid: string) {
    return await this.databaseService.transaction(async (client) => {
      // Delete dialplan details first
      await client.query(
        'DELETE FROM v_dialplan_details WHERE dialplan_uuid = $1 AND domain_uuid = $2',
        [dialplan_uuid, domain_uuid]
      );

      // Delete dialplan
      const result = await client.query(
        'DELETE FROM v_dialplans WHERE dialplan_uuid = $1 AND domain_uuid = $2 RETURNING *',
        [dialplan_uuid, domain_uuid]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Dialplan with UUID ${dialplan_uuid} not found`);
      }

      // Reload XML
      try {
        await this.freeswitchService.reloadXml();
      } catch (error) {
        console.error('Failed to reload XML in FreeSWITCH:', error);
      }

      return { deleted: true, dialplan: result.rows[0] };
    });
  }
}
