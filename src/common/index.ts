import { Logger } from "@nestjs/common";
import { displayName } from '../../package.json';


export * as interfaces from './interfaces';
export * from './config';
export * from './guards';
export { BaseService } from './base.service';
export { BaseController } from './base.controller';

export const logger = new Logger(displayName);