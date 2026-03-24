import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAboutDto } from './dto/create-about.dto';
import { UpdateAboutDto } from './dto/update-about.dto';
import { About } from './entities/about.entity';

@Injectable()
export class AboutService {
  constructor(
    @InjectRepository(About)
    private aboutRepository: Repository<About>,
  ) {}

  async getAboutContent(): Promise<About> {
    const content = await this.aboutRepository.find({
      order: { id: 'ASC' },
      take: 1,
    });
    
    if (content.length > 0) {
      return content[0];
    }
    
    // Default fallback content if db is empty
    return this.seedDefaultContent();
  }

  async updateAboutContent(updateAboutDto: UpdateAboutDto | CreateAboutDto): Promise<About> {
    const existingContent = await this.aboutRepository.find({
      order: { id: 'ASC' },
      take: 1,
    });

    if (existingContent.length > 0) {
      await this.aboutRepository.update(existingContent[0].id, updateAboutDto);
      return this.getAboutContent();
    }

    const newContent = this.aboutRepository.create(updateAboutDto);
    return this.aboutRepository.save(newContent);
  }

  private async seedDefaultContent(): Promise<About> {
    const defaultContent = this.aboutRepository.create({
      sparkDescription: "The journey of Knoweb (Pvt) Ltd began with a simple realization: the restaurant industry was running on passion, but slowing down on outdated systems. We know because we've been there. As former restaurant employees, we felt the stress of the Friday night rush, the lost orders, the communication gaps, and the frantic pace.",
      solutionDescription: "We didn't want to just build another app; we wanted to build a relief system. Anawuma was designed to tackle the real-world friction of dining. We combined our hands-on hospitality experience with cutting-edge technology to create a platform that feels natural to use for the guest, the waiter, and the manager.",
      missionDescription: "To empower restaurants worldwide with technology that respects local cultures of hospitality. We handle the data so you can focus on the food.",
      coreValues: [
        {
          title: "Empathy",
          description: "We solve problems we've actually lived."
        },
        {
          title: "Simplicity",
          description: "Technology should serve you, not confuse you."
        },
        {
          title: "Universally Local",
          description: "One platform that speaks the language of hospitality in every country."
        }
      ],
      howItWorks: [
        {
          title: "Set Up Your Account",
          icon: "fas fa-desktop"
        },
        {
          title: "Customize Your Menus and Services",
          icon: "fas fa-cogs"
        },
        {
          title: "Generate QR Codes for Tables/Rooms",
          icon: "fas fa-qrcode"
        },
        {
          title: "Customers Scan QR Codes to Access Menus and other Services",
          icon: "fas fa-mobile-alt"
        }
      ]
    });

    return this.aboutRepository.save(defaultContent);
  }
}
