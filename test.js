import request from 'supertest';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import app from './api.js';

const secretKey = 'Kaas';
const token = jwt.sign({ username: 'demo' }, secretKey);

describe('Dealership API', () => {
  it('should log in and return a JWT token', (done) => {
    request(app)
      .post('/login')
      .send({ username: 'demo', password: 'password' })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('accessToken');
        done();
      });
  });

  it('should get all dealerships', (done) => {
    request(app)
      .get('/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an('array');
        done();
      });
  });

  it('should create a new dealership', (done) => {
    request(app)
      .post('/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Dealership' })
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('id');
        done();
      });
  });

  it('should get a specific dealership by ID', (done) => {
    request(app)
      .post('/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Another Dealership' })
      .end((err, res) => {
        if (err) return done(err);
        const dealershipId = res.body.id;
        request(app)
          .get(`/dealerships/${dealershipId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.have.property('name', 'Another Dealership');
            done();
          });
      });
  });

  it('should update a dealership by ID', (done) => {
    request(app)
      .post('/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dealership to Update' })
      .end((err, res) => {
        if (err) return done(err);
        const dealershipId = res.body.id;
        request(app)
          .put(`/dealerships/${dealershipId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Updated Dealership' })
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            request(app)
              .get(`/dealerships/${dealershipId}`)
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('name', 'Updated Dealership');
                done();
              });
          });
      });
  });

  it('should delete a dealership by ID', (done) => {
    request(app)
      .post('/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dealership to Delete' })
      .end((err, res) => {
        if (err) return done(err);
        const dealershipId = res.body.id;
        request(app)
          .delete(`/dealerships/${dealershipId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            request(app)
              .get(`/dealerships/${dealershipId}`)
              .set('Authorization', `Bearer ${token}`)
              .expect(404)
              .end(done);
          });
      });
  });
});
