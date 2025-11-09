import { HttpStatus, Injectable } from "@nestjs/common";
import { logger } from ".";
import { ServiceResponse } from "./interfaces";

@Injectable()
export class BaseService {
    protected HandleError(error: Error): ServiceResponse<never> {
        return {
            errMessage: error.message || 'internal server error',
            isError: true,
            error
        }
    }

    protected Results<T>(data: T): ServiceResponse<T> {
        return {
            data: data as T,
            isError: false,
            // errMessage: undefined,
        };
    }
}