import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FreeswitchService } from '../freeswitch/freeswitch.service';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';

export interface RingGroupDestination {
  ring_group_destination_uuid?: string;
  ring_group_uuid?: string;
  domain_uuid?: string;
  destination_number: string;
  destination_delay?: number;
  destination_timeout?: number;
  destination_prompt?: number;
  destination_description?: string;
  destination_enabled?: string;
}

export interface RingGroup {
  ring_group_uuid?: string;
  domain_name: string;
  domain_uuid: string;
  ring_group_name: string;
  ring_group_extension?: string;
  ring_group_greeting?: string;
  ring_group_strategy?: string;
  ring_group_timeout_sec?: number;
  ring_group_timeout_app?: string;
  ring_group_timeout_data?: string;
  ring_group_cid_name_prefix?: string;
  ring_group_cid_number_prefix?: string;
  ring_group_huntgroup_enabled?: string;
  ring_group_call_forward_enabled?: string;
  ring_group_caller_announce?: string;
  ring_group_distinctive_ring?: string;
  ring_group_ringback?: string;
  ring_group_context?: string;
  ring_group_enabled?: string;
  ring_group_description?: string;
  dialplan_uuid?: string;
  insert_date?: string;
  insert_user?: string;
  update_date?: string;
  update_user?: string;
  destinations?: RingGroupDestination[];
}

@Injectable()
export class RingGroupsService {
  constructor(
    private databaseService: DatabaseService,
    private freeswitchService: FreeswitchService,
  ) {}

  async findAll(domain_uuid: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM v_ring_groups WHERE domain_uuid = $1 ORDER BY ring_group_name',
      [domain_uuid]
    );
    return result.rows;
  }

  async findOne(ring_group_uuid: string, domain_uuid: string) {
    const ringGroup = await this.databaseService.query(
      'SELECT * FROM v_ring_groups WHERE ring_group_uuid = $1 AND domain_uuid = $2',
      [ring_group_uuid, domain_uuid]
    );

    if (ringGroup.rows.length === 0) {
      throw new NotFoundException(`Ring group with UUID ${ring_group_uuid} not found`);
    }

    // Get ring group destinations
    const destinations = await this.databaseService.query(
      `SELECT * FROM v_ring_group_destinations 
       WHERE ring_group_uuid = $1 AND domain_uuid = $2 
       ORDER BY destination_delay, destination_number`,
      [ring_group_uuid, domain_uuid]
    );

    return {
      ...ringGroup.rows[0],
      destinations: destinations.rows,
    };
  }

  async create(ringGroup: RingGroup) {
    const ring_group_uuid = uuidv4();
    const now = new Date().toISOString();

    // get domain by param domain_name
    const domainsResult = await this.databaseService.query(
      'SELECT domain_uuid, domain_name FROM v_domains WHERE domain_name = $1 LIMIT 1',
      [ringGroup.domain_name]
    );

    let domain_uuid = "";
    let domain_name = ""
    if (domainsResult.rows.length > 0) {
      console.log("Dong domain lay ra duoc : ");
      console.log(domainsResult.rows[0]);
      domain_uuid = domainsResult.rows[0].domain_uuid;
      domain_name = domainsResult.rows[0].domain_name;
    }

    console.log("Domain UUID lay duoc tu domain name la : " + domain_uuid);

    return await this.databaseService.transaction(async (client) => {
      // Insert ring group
      const result = await client.query(
        `INSERT INTO v_ring_groups (
          ring_group_uuid, domain_uuid, ring_group_name, ring_group_extension,
          ring_group_greeting, ring_group_strategy, ring_group_call_timeout,
          ring_group_timeout_app, ring_group_timeout_data,
          ring_group_cid_name_prefix, ring_group_cid_number_prefix,
          ring_group_context, ring_group_enabled, ring_group_description,
          insert_date, insert_user
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          ring_group_uuid,
          domain_uuid,
          ringGroup.ring_group_name,
          ringGroup.ring_group_extension || '',
          ringGroup.ring_group_greeting || '',
          ringGroup.ring_group_strategy || 'simultaneous',
          ringGroup.ring_group_timeout_sec || 30,
          ringGroup.ring_group_timeout_app || '',
          ringGroup.ring_group_timeout_data || '',
          ringGroup.ring_group_cid_name_prefix || '',
          ringGroup.ring_group_cid_number_prefix || '',
          ringGroup.ring_group_context || domain_name,
          ringGroup.ring_group_enabled || 'true',
          ringGroup.ring_group_description || '',
          now,
          ringGroup.insert_user || null,
        ]
      );

      // Insert ring group destinations if provided
      if (ringGroup.destinations && ringGroup.destinations.length > 0) {
        for (const destination of ringGroup.destinations) {
          const destination_uuid = uuidv4();
          await client.query(
            `INSERT INTO v_ring_group_destinations (
              ring_group_destination_uuid, ring_group_uuid, domain_uuid,
              destination_number, destination_delay, destination_timeout,
              destination_prompt, destination_description, destination_enabled
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              destination_uuid,
              ring_group_uuid,
              domain_uuid,
              destination.destination_number,
              destination.destination_delay || 0,
              destination.destination_timeout || 30,
              destination.destination_prompt || null,
              destination.destination_description || '',
              destination.destination_enabled || 'true'
            ]
          );
        }
      }

      // Chuan bi insert DialPlan
      const dialplan_uuid = uuidv4();
      const dialplan_app_uuid = '1d61fb65-1eec-bc73-a6ee-a6203b4fe6f2';

      // generate Dialplan XML
      const dialplanXmlContent = this.generateRingGroupDialplanXml({
        ringGroupName: ringGroup.ring_group_name,
        ringGroupExtension: ringGroup.ring_group_extension,
        ringGroupUuid: ring_group_uuid,
        dialplanUuid: dialplan_uuid,
        domainUuid: domain_uuid,
        domainName: domain_name
      });

      console.log("Noi dung doan DialPlan XML : " + dialplanXmlContent);

      //const dialplanXmlContent = null;

      // Thuc hien insert DialPlan
      const dialplan_result = await client.query(
        `INSERT INTO v_dialplans (
          domain_uuid, dialplan_uuid, app_uuid, dialplan_context,
          dialplan_name, dialplan_number, dialplan_continue, dialplan_xml, dialplan_order, dialplan_enabled,
          insert_date, insert_user
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          domain_uuid,
          dialplan_uuid,
          dialplan_app_uuid,
          ringGroup.ring_group_context || domain_name,
          ringGroup.ring_group_name,
          ringGroup.ring_group_extension || '',
          'false',
          dialplanXmlContent,
          101,
          'true',
          now,
          null
        ]
      );

      const ringGroup_update_result = await client.query(
        `UPDATE v_ring_groups SET dialplan_uuid = $1 
         WHERE ring_group_uuid = $2 AND domain_uuid = $3
         RETURNING *`,
        [
          dialplan_uuid,
          ring_group_uuid,
          domain_uuid
        ]
      );


      const file_path = '/var/cache/fusionpbx/dialplan.' + domain_name;
      exec(`sudo rm -f ${file_path}`, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
        }
        else {
          console.log(`File ${file_path} da bi xoa!`);
        }
      });


      // Reload XML
      try {
        const reloadXml_result = await this.freeswitchService.reloadXml();
        console.log("Create ring group - Ket qua reload XML : ");
        console.log(reloadXml_result);
      } catch (error) {
        console.error('Failed to reload XML in FreeSWITCH:', error);
      }

      return result.rows[0];
    });
  }

  async update(ring_group_uuid: string, domain_uuid: string, ringGroup: Partial<RingGroup>) {
    const now = new Date().toISOString();

    return await this.databaseService.transaction(async (client) => {
      // Update ring group
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fields = [
        'ring_group_name', 'ring_group_extension', 'ring_group_greeting',
        'ring_group_strategy', 'ring_group_timeout_sec', 'ring_group_timeout_app',
        'ring_group_timeout_data', 'ring_group_cid_name_prefix', 'ring_group_cid_number_prefix',
        'ring_group_context', 'ring_group_enabled', 'ring_group_description'
      ];

      for (const field of fields) {
        if (ringGroup[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(ringGroup[field]);
        }
      }

      updates.push(`update_date = $${paramIndex++}`);
      values.push(now);
      updates.push(`update_user = $${paramIndex++}`);
      values.push(ringGroup.update_user || 'api');

      values.push(ring_group_uuid);
      values.push(domain_uuid);

      const result = await client.query(
        `UPDATE v_ring_groups SET ${updates.join(', ')} 
         WHERE ring_group_uuid = $${paramIndex} AND domain_uuid = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Ring group with UUID ${ring_group_uuid} not found`);
      }

      // Update destinations if provided
      if (ringGroup.destinations !== undefined) {
        // Delete existing destinations
        await client.query(
          'DELETE FROM v_ring_group_destinations WHERE ring_group_uuid = $1 AND domain_uuid = $2',
          [ring_group_uuid, domain_uuid]
        );

        // Insert new destinations
        for (const destination of ringGroup.destinations) {
          const destination_uuid = uuidv4();
          await client.query(
            `INSERT INTO v_ring_group_destinations (
              ring_group_destination_uuid, ring_group_uuid, domain_uuid,
              destination_number, destination_delay, destination_timeout,
              destination_prompt
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              destination_uuid,
              ring_group_uuid,
              domain_uuid,
              destination.destination_number,
              destination.destination_delay || 0,
              destination.destination_timeout || 30,
              destination.destination_prompt || '',
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

  async remove(ring_group_uuid: string, domain_uuid: string) {
    return await this.databaseService.transaction(async (client) => {
      // Delete ring group destinations first
      await client.query(
        'DELETE FROM v_ring_group_destinations WHERE ring_group_uuid = $1 AND domain_uuid = $2',
        [ring_group_uuid, domain_uuid]
      );

      // Delete ring group
      const result = await client.query(
        'DELETE FROM v_ring_groups WHERE ring_group_uuid = $1 AND domain_uuid = $2 RETURNING *',
        [ring_group_uuid, domain_uuid]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Ring group with UUID ${ring_group_uuid} not found`);
      }

      // Reload XML
      try {
        await this.freeswitchService.reloadXml();
      } catch (error) {
        console.error('Failed to reload XML in FreeSWITCH:', error);
      }

      return { deleted: true, ringGroup: result.rows[0] };
    });
  }


  private generateRingGroupDialplanXml(params: {
    ringGroupName: string;
    ringGroupExtension: string;
    ringGroupUuid: string;
    dialplanUuid: string;
    domainUuid: string;
    domainName: string;
  }): string {

    const {
      ringGroupName,
      ringGroupExtension,
      ringGroupUuid,
      dialplanUuid,
      domainUuid,
      domainName
    } = params;

    return `
      <extension name="${ringGroupName}" continue="" uuid="${dialplanUuid}">
        <condition field="destination_number" expression="^${ringGroupExtension}$">
          <action application="ring_ready" data=""/>
          <action application="set" data="ring_group_uuid=${ringGroupUuid}"/>
          <action application="lua" data="app.lua ring_groups"/>
        </condition>
      </extension>
    `.trim();
  }
}
