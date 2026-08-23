import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum TimeseriesUnit {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export class GetCommitsTimeseriesQueryDto {
  @IsOptional() //undefined, nullの場合バリデーションチェックスキップ
  @IsEnum(TimeseriesUnit) // Enumの定義値かどうか
  unit: TimeseriesUnit = TimeseriesUnit.Week; // デフォルト値（week）設定

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  repository?: string;
}
