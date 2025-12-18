import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as modesl from 'modesl';

@Injectable()
export class FreeswitchService implements OnModuleInit {
  private readonly logger = new Logger(FreeswitchService.name);
  private connection: any;
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
    this.logger.log('FreeSWITCH ESL service initialized');
  }

  private async getConnection(): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log("ESL Host : " + this.eslHost);
      console.log("ESL Port : " + this.eslPort);
      console.log("ESL Password : " + this.eslPassword);

      const conn = new modesl.Connection(this.eslHost, this.eslPort, this.eslPassword, () => {
        this.logger.log('ESL connected successfully');
        resolve(conn);
      });

      conn.on('error', (error) => {
        this.logger.error('ESL connection error', error);
        reject(error);
      });
    });
  }

  async executeCommand(command: string): Promise<string> {
    let conn;
    try {
      conn = await this.getConnection();
      
      return new Promise((resolve, reject) => {
        conn.api(command, (response) => {
          const body = response.getBody();
          this.logger.debug(`Command executed: ${command}, Response: ${body}`);
          conn.disconnect();
          resolve(body);
        });

        conn.on('error', (error) => {
          conn.disconnect();
          reject(error);
        });
      });
    } catch (error) {
      if (conn) conn.disconnect();
      this.logger.error(`Failed to execute command: ${command}`, error);
      throw error;
    }
  }

  async reloadXml(): Promise<string> {
    return await this.executeCommand('reloadxml');
  }

  async reloadAcl(): Promise<string> {
    return await this.executeCommand('reloadacl');
  }

  async rescan(): Promise<string> {
    return await this.executeCommand('rescan');
  }

  async status(): Promise<string> {
    return await this.executeCommand('status');
  }

  async sofia(profile: string, command: string): Promise<string> {
    return await this.executeCommand(`sofia ${profile} ${command}`);
  }

  async sofiaProfileRestart(profile: string): Promise<string> {
    return await this.executeCommand(`sofia profile ${profile} restart`);
  }

  async sofiaProfileRescan(profile: string): Promise<string> {
    return await this.executeCommand(`sofia profile ${profile} rescan`);
  }

  async reloadGateway(gateway: string): Promise<string> {
    return await this.executeCommand(`sofia profile external killgw ${gateway}`);
  }
}
