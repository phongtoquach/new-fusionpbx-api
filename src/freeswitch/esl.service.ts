import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as modesl from 'modesl';
import axios from 'axios';

@Injectable()
export class EslService implements OnModuleInit {
  private readonly logger = new Logger(EslService.name);
  private conn: any;
  private eslHost: string;
  private eslPort: number;
  private eslPassword: string;

  constructor(private configService: ConfigService) {
    this.eslHost = this.configService.get('ESL_HOST');
    this.eslPort = this.configService.get('ESL_PORT');
    this.eslPassword = this.configService.get('ESL_PASSWORD');

    this.logger.log("ESL Host : " + this.eslHost);
    this.logger.log("ESL Port : " + this.eslPort);
    this.logger.log("ESL Password : " + this.eslPassword);
  }

  async onModuleInit() {
    this.logger.log('ESL service initialized!');
    this.startListener();
  }

  startListener() {
    this.conn = new modesl.Connection(
      this.eslHost,
      this.eslPort,
      this.eslPassword,
      () => {
        console.log('Congratulation! ESL connected to FreeSWITCH!');

        // Lắng nghe các event cần thiết
        this.conn.events(
          'plain',
          'CHANNEL_CREATE CHANNEL_BRIDGE CHANNEL_ANSWER CHANNEL_HANGUP_COMPLETE CHANNEL_OUTGOING'
        );
      }
    );

    // CALL START (CHANNEL_CREATE)
    this.conn.on('esl::event::CHANNEL_CREATE::*', async (event) => {

      const hook_data = {
        unique_id: event.getHeader('Unique-ID'),
        caller_id_number: event.getHeader('Caller-Caller-ID-Number'),
        caller_id_name: event.getHeader('Caller-Caller-ID-Name'),
        destination_number: event.getHeader('Caller-Destination-Number'),
        call_direction: event.getHeader('Call-Direction'),
        called_context: event.getHeader('Caller-Context'),
        fs_hostname: event.getHeader('FreeSWITCH-Hostname')
      };

      console.log('event CALL START (CHANNEL_CREATE) - Web hook Data:', hook_data);

      // Gửi nội bộ đến controller NestJS
      // try {
      //   await axios.post(
      //     'http://localhost:3001/webhook/esl/call-start',
      //     hook_data
      //   );
      // } catch (err) {
      //   console.error('Error sending internal webhook:', err.message);
      // }
    });

    // CALL ANSWER
    this.conn.on('esl::event::CHANNEL_ANSWER::*', (event) => {
      const hook_data = {
        unique_id: event.getHeader('Unique-ID'),
        caller_id_number: event.getHeader('Caller-Caller-ID-Number'),
        caller_id_name: event.getHeader('Caller-Caller-ID-Name'),
        destination_number: event.getHeader('Caller-Destination-Number'),
        variable_sip_to_user: event.getHeader('variable_sip_to_user'),
        answer_state: event.getHeader('Answer-State'),
        caller_channel_answered_time: event.getHeader('Caller-Channel-Answered-Time'),
      };

      console.log('event CHANNEL_ANSWER - Web hook Data:', hook_data);
    });

    // CHANNEL_BRIDGE
    this.conn.on('esl::event::CHANNEL_BRIDGE::*', (event) => {
      const hook_data = {
        unique_id: event.getHeader('Unique-ID'),
        event_name: event.getHeader('Event-Name'),
        caller_id_number: event.getHeader('Caller-Caller-ID-Number'),
        caller_id_name: event.getHeader('Caller-Caller-ID-Name'),
        group_destination_number: event.getHeader('Caller-Destination-Number'),
        other_leg_destination_number: event.getHeader('Other-Leg-Destination-Number'),
        other_leg_callee_number: event.getHeader('Other-Leg-Callee-ID-Number'),
        caller_callee_id_number: event.getHeader('Caller-Callee-ID-Number')
      };

      console.log('event CHANNEL_BRIDGE - Web hook Data:', hook_data);


      // console.log('event CHANNEL_BRIDGE - All headers : ');
      // const headers = event.headers;
      // // Print all headers safely
      // for (const name in headers) {
      //     const val = headers[name];
      //     console.log(`${name}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
      // }
    });

    // CHANNEL_OUTGOING
    this.conn.on('esl::event::CHANNEL_OUTGOING::*', (event) => {
      const hook_data = {
        unique_id: event.getHeader('Unique-ID'),
        event_name: event.getHeader('Event-Name'),
        caller_id_number: event.getHeader('Caller-Caller-ID-Number'),
        caller_id_name: event.getHeader('Caller-Caller-ID-Name'),
        destination_number: event.getHeader('Caller-Destination-Number'),
        variable_originate_disposition: event.getHeader('variable_originate_disposition'),
        other_leg_caller_id_number: event.getHeader('Caller-Orig-Caller-ID-Number')
      };

      console.log('event CHANNEL_OUTGOING - Web hook Data:', hook_data);
    });

    // CALL END
    this.conn.on('esl::event::CHANNEL_HANGUP_COMPLETE::*', (event) => {
      const hook_data = {
        unique_id: event.getHeader('Unique-ID'),
        caller_id_number: event.getHeader('Caller-Caller-ID-Number'),
        caller_id_name: event.getHeader('Caller-Caller-ID-Name'),
        destination_number: event.getHeader('Caller-Destination-Number'),
        variable_sip_to_user: event.getHeader('variable_sip_to_user'),
        hangup_cause: event.getHeader('Hangup-Cause'),
        variable_duration: event.getHeader('variable_duration'),
        variable_billsec: event.getHeader('variable_billsec'),
        variable_answersec: event.getHeader('variable_answersec')
      };

      console.log('event CHANNEL_HANGUP_COMPLETE - Web hook Data:', hook_data);
    });

    this.conn.on('error', (err) => {
      console.error('ESL Error:', err);
      setTimeout(() => this.startListener(), 3000);  // auto reconnect
    });
  }
}
