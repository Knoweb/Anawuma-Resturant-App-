import { IsArray, IsNumber, IsOptional, IsString, Min, IsBoolean } from 'class-validator';

export class CreateManualInvoiceDto {
    @IsArray()
    @IsNumber({}, { each: true })
    orderIds: number[];

    @IsString()
    identifier: string; // Room or Table No

    @IsOptional()
    @IsNumber()
    @Min(0)
    taxAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    serviceCharge?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;

    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;
}
