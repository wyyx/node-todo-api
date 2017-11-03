const expect = require('expect')
const request = require('supertest')
const {
    ObjectId
} = require('mongodb')

const {
    app
} = require('./../server')
const {
    Todo
} = require('./../models/todo')
const {
    User
} = require('./../models/user')
const {
    todos,
    populateTodos,
    users,
    populateUsers
} = require('./seed/seed')

beforeEach(populateUsers)
beforeEach(populateTodos)

describe('POST /todos', () => {
    it('should create a new todo', (done) => {
        var text = 'Test todo text'

        request(app)
            .post('/todos')
            .send({
                text
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.text).toBe(text)
            })
            .end((err, res) => {
                if (err) {
                    return done(err)
                }

                Todo.find({
                    text
                }).then((todos) => {
                    expect(todos.length).toBe(1)
                    expect(todos[0].text).toBe(text)
                    done()
                }).catch((err) => {
                    done(err)
                })
            })
    })

    it('should not create todo with invalid body data', (done) => {
        request(app)
            .post('/todos')
            .send({})
            .expect(400)
            .end((err, res) => {
                if (err) {
                    return done(err)
                }

                Todo.find()
                    .then((todos) => {
                        expect(todos.length).toBe(2)
                        done()
                    })
                    .catch((err) => {
                        done(err)
                    })
            })
    })
})


describe('GET /todos', () => {
    it('should get all todos', (done) => {
        request(app)
            .get('/todos')
            .expect(200)
            .expect((res) => {
                expect(res.body.todos.length).toBe(2)
            })
            .end(done)
    })
})


describe('GET /todos/:id', () => {
    it('should return todo doc', (done) => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString()}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(todos[0].text)
            })
            .end(done)

    })

    it('should return 400 if todo id is not valid', (done) => {
        request(app)
            .get('/todos/123')
            .expect(400)
            .end(done)
    })

    it('should return 404 if todo not found', (done) => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString().replace(/\w/,'8')}`)
            .expect(404)
            .end(done)
    })
})

describe('DELETE /todos/:id', () => {

    it('should return 200', (done) => {

        request(app)
            .delete(`/todos/${todos[0]._id.toHexString()}`)
            .expect(200)
            .expect((res) => {
                let id = `${todos[0]._id.toHexString()}`
                expect(res.body.todo._id).toBe(id)
            })
            .end((err, res) => {
                if (err) {
                    return done(err)
                }

                let id = res.body.todo._id
                Todo.findById(id)
                    .then((todo) => {
                        expect(todo).toNotExist()
                        done()
                    })
                    .catch((err) => {
                        done(err)
                    })
            })
    })

    it('should return 400 if todo id is not valid', (done) => {
        request(app)
            .delete('/todos/123')
            .expect(400)
            .end(done)
    })

    it('should return 404 if not find', (done) => {
        let url = `/todos/${todos[0]._id.toHexString()}`
        url = url.substr(0, url.length - 1) + '0'
        // console.log(url)
        request(app)
            .delete(url)
            .expect(404)
            .end(done)
    })
})

describe('PATCH /todos/:id', () => {
    it('should update the todo', (done) => {
        let id = todos[0]._id.toHexString()
        let text = 'This should be the new text'

        request(app)
            .patch(`/todos/${id}`)
            .send({
                completed: true,
                text
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(text)
                expect(res.body.todo.completed).toBe(true)
                expect(res.body.todo.completedAt).toBeA('number')
            })
            .end(done)
    })
})

describe('GET /users/me', () => {
    it('should return user if authenticated', (done) => {
        request(app)
            .get('/users/me')
            .set('x-auth', users[0].tokens[0].token)
            .expect((res) => {
                expect(res.body._id).toBe(users[0]._id.toHexString())
                expect(res.body.email).toBe(users[0].email)
            })
            .end(done)
    })

    it('should return 401 if not authenticated', (done) => {
        request(app)
            .get('/users/me')
            .expect(401)
            .expect((res) => {
                expect(res.body).toEqual({})
            })
            .end(done)
    })
})

describe('POST /users', () => {
    it('should create a user', (done) => {
        let email = 'example@example.com'
        let password = '123jkl'

        request(app)
            .post('/users')
            .send({
                email,
                password
            })
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toExist()
                expect(res.body._id).toExist()
                expect(res.body.email).toBe(email)
            })
            .end((err) => {
                if (err) {
                    return done(err)
                }

                User.findOne({
                        email
                    })
                    .then((user) => {
                        expect(user).toExist()
                        expect(user.password).toNotBe(password)
                        done()
                    })
            })
    })

    it('should return validation errors if request invalid', (done) => {
        request(app)
            .post('/users')
            .send({
                email: 'and',
                password: '123'
            })
            .expect(400)
            .end(done)
    })

    it('should not create user if email in use', (done) => {
        request(app)
            .post('/users')
            .send({
                email: users[0].email,
                password: 'thisispassword123'
            })
            .expect(400)
            .end(done)
    })
})