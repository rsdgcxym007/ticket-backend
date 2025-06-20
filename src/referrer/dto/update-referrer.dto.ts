import { PartialType } from '@nestjs/mapped-types';
import { CreateReferrerDto } from './create-referrer.dto';

export class UpdateReferrerDto extends PartialType(CreateReferrerDto) {}
