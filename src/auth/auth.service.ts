import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {}

  async login(username: string, password: string) {
    // For testing: validate against hardcoded credentials
    const testUsername = this.configService.get('TEST_USERNAME');
    const testPassword = this.configService.get('TEST_PASSWORD');

    //const testUsername = "admin"
    //const testPassword = "admin"

    username = "admin"
    password = "admin"
    
    // TEMPORARY DEBUG - Remove after testing
    console.log('=== DEBUG LOGIN ===');
    console.log('Received username:', username);
    console.log('Received password:', password);
    console.log('Expected username:', testUsername);
    console.log('Expected password:', testPassword);
    console.log('==================');

    if (username !== testUsername || password !== testPassword) {
      throw new UnauthorizedException('Invalid credentials 123');
    }

    // Get first domain for testing (or you can hardcode a domain_uuid)
    const domainsResult = await this.databaseService.query(
      'SELECT domain_uuid, domain_name FROM v_domains LIMIT 1'
    );

    let domain_uuid = uuidv4(); // fallback
    if (domainsResult.rows.length > 0) {
      domain_uuid = domainsResult.rows[0].domain_uuid;
    }

    const payload = {
      username,
      domain_uuid,
      user_uuid: uuidv4(), // generate test user_uuid
    };

    return {
      access_token: this.jwtService.sign(payload),
      username,
      domain_uuid,
      expires_in: this.configService.get('JWT_EXPIRATION'),
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
