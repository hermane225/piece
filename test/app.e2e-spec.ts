import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/posts/filters (GET) - public', () => {
    return request(app.getHttpServer())
      .get('/api/posts/filters')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('categories');
        expect(res.body).toHaveProperty('conditions');
      });
  });

  it('/api/chat/conversations (GET) - requires auth', () => {
    return request(app.getHttpServer())
      .get('/api/chat/conversations')
      .expect(401);
  });

  it('/api/chat/conversations (POST) - requires auth', () => {
    return request(app.getHttpServer())
      .post('/api/chat/conversations')
      .send({ participantIds: ['5b67c2db-4721-4ef8-95d6-332860d3f3bf'] })
      .expect(401);
  });

  it('/api/notifications (GET) - requires auth', () => {
    return request(app.getHttpServer())
      .get('/api/notifications')
      .expect(401);
  });

  it('/api/notifications/unread-count (GET) - requires auth', () => {
    return request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .expect(401);
  });

  it('/api/recommendations/posts (GET) - requires auth', () => {
    return request(app.getHttpServer())
      .get('/api/recommendations/posts')
      .expect(401);
  });

  it('/api/recommendations/preferences (PUT) - requires auth', () => {
    return request(app.getHttpServer())
      .put('/api/recommendations/preferences')
      .send({
        preferences: [{ category: 'PHONE', weight: 3 }],
      })
      .expect(401);
  });

  it('/api/recommendations/searches (POST) - requires auth', () => {
    return request(app.getHttpServer())
      .post('/api/recommendations/searches')
      .send({ query: 'moteur toyota', category: 'AUTO_PARTS' })
      .expect(401);
  });
});
