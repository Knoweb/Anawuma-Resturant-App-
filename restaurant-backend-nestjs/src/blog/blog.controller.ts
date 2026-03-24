import { Controller, Get, Param, Query, Post, OnModuleInit } from '@nestjs/common';
import { BlogService } from './blog.service';

@Controller('blogs')
export class BlogController implements OnModuleInit {
  constructor(private readonly blogService: BlogService) {}

  async onModuleInit() {
    await this.blogService.seed();
  }

  @Get()
  async findAll(
    @Query('query') query?: string,
    @Query('category') category?: string
  ) {
    const blogs = await this.blogService.findAll(query, category);
    return { success: true, data: blogs };
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.blogService.getCategories();
    return { success: true, data: categories };
  }

  @Get('recent')
  async getRecent(@Query('limit') limit?: number) {
    const blogs = await this.blogService.getRecent(limit);
    return { success: true, data: blogs };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const blog = await this.blogService.findOne(+id);
    return { success: true, data: blog };
  }
}
