import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactRequest } from './entities/contact-request.entity';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactRequest)
    private readonly contactRepository: Repository<ContactRequest>,
  ) {}

  async create(createContactRequestDto: CreateContactRequestDto): Promise<ContactRequest> {
    const contactRequest = this.contactRepository.create(createContactRequestDto);
    return await this.contactRepository.save(contactRequest);
  }

  async findAll(): Promise<ContactRequest[]> {
    return await this.contactRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
