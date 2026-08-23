import { TimeseriesUnit } from './dto/get-commits-timeseries.dto';

export interface CommitsTimeseriesQuery {
  unit: TimeseriesUnit;
  from?: Date;
  to?: Date;
  repository?: string;
}

export interface CommitsTimeseriesResult {
  data: {
    period: string;
    count: number;
  }[];
}
