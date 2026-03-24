import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Blog } from './entities/blog.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
  ) {}

  async findAll(query?: string, category?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (query) {
      where.title = Like(`%${query}%`);
    }

    const blogs = await this.blogRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return blogs;
  }

  async findOne(id: number) {
    const blog = await this.blogRepository.findOne({ where: { id } });
    if (!blog) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
    return blog;
  }

  async getCategories() {
    const categories = await this.blogRepository
      .createQueryBuilder('blog')
      .select('blog.category', 'name')
      .addSelect('COUNT(blog.id)', 'count')
      .groupBy('blog.category')
      .getRawMany();
    
    return categories;
  }

  async getRecent(limit = 4) {
    return this.blogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Seeding method to avoid the user having to add data manually
  async seed() {
    const count = await this.blogRepository.count();
    if (count > 0) return;

    const dummyBlogs = [
      {
        title: "5 Ways to Boost Your Restaurant's Table Turnover Rate (Without Rushing Guests)",
        content: `Table turnover is a key metric for any busy restaurant. It's the art of serving more guests during peak hours without making anyone feel rushed or pressured. A faster turnover means more revenue, but a poor guest experience means they may never come back. So, how do you find that perfect balance?\n\nThe secret isn't about hurrying your guests out the door; it's about making your service so seamless and efficient that the process flows naturally. Here are five practical ways to boost your table turnover rate while keeping your guests happy and your staff sane.\n\n1. Streamline the Order-Taking Process\nThe moment a guest sits down, the clock starts ticking. Traditional order-taking can often create bottlenecks. Waiting for a server to be available, describing menu items, and scribbling it all down can take valuable minutes, especially with larger parties.\n\nThe Modern Solution: Consider a digital ordering system. With a QR-based system, guests can scan a code on their table to browse your menu, place their order, and send it directly to the kitchen. This frees up your servers to focus on what they do best: answering questions, making recommendations, and ensuring guests have an exceptional experience. This simple shift can shave minutes off each table, and those minutes add up fast.`,
        excerpt: "Learn how modern QR code systems are revolutionizing table turnover and order accuracy in the hospitality industry.",
        category: 'Restaurant Management',
        tags: 'Restaurant, Management, Efficiency',
        author: 'Lindsey M. Brownlee',
        imageUrl: '/assets/images/blog/Blog Post 1.png',
      },
      {
        title: "The Secret Ingredient to Success: How Data Can Transform Your Restaurant, Cafe, or Hotel",
        content: `In the competitive world of hospitality, we all know that great food, impeccable service, and a welcoming atmosphere are essential. But what if there was a secret ingredient that could take your business to the next level? That ingredient is data.\n\nData isn't just for tech giants and big corporations. It's a powerful tool that, when used correctly, can help small restaurants, cafes, spas, and hotels make smarter decisions, reduce waste, and increase profits. Here's a look at how using data can influence your business for the better.\n\n1. Know Your Menu, Inside and Out\nHave you ever wondered which of your menu items are the real stars and which ones are just taking up space? Data gives you the answers. By tracking customer buying behavior, you can identify:\n\nFast-Moving Items: These are your most popular dishes and drinks. Knowing them helps you ensure you always have enough ingredients in stock, preventing a frustrating "sold out" notice for your guests.\nSeasonal Trends: Does your refreshing iced coffee sell more in the summer? Do hearty soups fly off the menu in the winter? Data helps you understand these patterns, allowing you to adjust your inventory and menu offerings accordingly.`,
        excerpt: "Data isn't just for tech giants. It's a powerful tool that helps small hospitality businesses make smarter decisions.",
        category: 'Data Analytics',
        tags: 'Data Analytics, Restaurant, Management, Hospitality',
        author: 'Lindsey M. Brownlee',
        imageUrl: '/assets/images/blog/Blog Post 2.png',
      },
      {
        title: '10 Tips for Better Hospitality Operations',
        content: 'Running a hotel or restaurant requires meticulous attention to detail. From staff management to inventory tracking, every process should be optimized for a smooth guest experience. In this post, we explore the essential pillars of modern hospitality management.',
        excerpt: 'Running a hotel or restaurant requires meticulous attention to detail. Here are our top 10 tips for success.',
        category: 'Operations',
        tags: 'Management, Business, Operations',
        author: 'Sajan Anjaya',
        imageUrl: '/assets/images/features/Business people writing agreement, shaking hands.jpg',
      },
      {
        title: 'The Future of Digital Menus',
        content: 'Digital menus are more than just a COVID-19 placeholder. They are powerful tools for dynamic pricing and better customer engagement. As diners become more tech-savvy, the expectation for interactive and informative digital menus grows.',
        excerpt: 'Digital menus are more than just a COVID-19 placeholder. They are powerful tools for dynamic pricing and better customer engagement.',
        category: 'Technology',
        tags: 'Digital, Menus, Technology',
        author: 'Admin',
        imageUrl: '/assets/images/features/menus-ui.jpg',
      }
    ];

    await this.blogRepository.save(dummyBlogs);
  }
}
