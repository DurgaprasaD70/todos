const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const format = require('date-fns/format')
const path = require('path')
const dbPath = path.join(__dirname, 'todoApplication.db')

const app = express()
app.use(express.json())

let db = null
const initilizeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('This server running on http://localhost:3000')
    })
  } catch (error) {
    console.log(`DB ERROR: ${error.message}`)
    process.exit(1)
  }
}

initilizeDbAndServer()

//API 1

const hasPriorityAndStatus = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndStatus = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndPriority = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

const hasStatus = requestQuery => {
  return requestQuery.status !== undefined
}

const hasPriority = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasCategory = requestQuery => {
  return requestQuery.category !== undefined
}

app.get('/todos/', async (request, response) => {
  let data = null
  let getTodoQuery = ``
  let columnUpdate = ''
  const {search_q = '', priority, status, category} = request.query

  switch (true) {
    case hasPriorityAndStatus(request.query):
      getTodoQuery = `
          SELECT
           * 
          FROM 
           todo 
          WHERE
           priority = "${priority}" AND status = "${status}";`
      break
    case hasCategoryAndStatus(request.query):
      getTodoQuery = `
          SELECT 
           * 
          FROM 
           todo 
          WHERE
          category = "${category}" AND status = "${status}";`
      break
    case hasCategoryAndPriority(request.query):
      getTodoQuery = `SELECT 
           * 
          FROM 
           todo 
          WHERE 
           category = "${category}" AND priority = "${priority}";`
      break
    case hasStatus(request.query):
      columnUpdate = 'Status'
      getTodoQuery = `
          SELECT 
           * 
          FROM 
           todo 
          WHERE 
           status = "${status}";`
      break
    case hasPriority(request.query):
      columnUpdate = 'Priority'
      getTodoQuery = `
          SELECT 
           * 
          FROM 
           todo 
          WHERE
           priority = "${priority}";`
      break
    case hasCategory(request.query):
      columnUpdate = 'Category'
      getTodoQuery = `
          SELECT 
           * 
          FROM 
           todo 
          WHERE
           category = "${category}";`
      break
    default:
      getTodoQuery = `
          SELECT 
           * 
          FROM 
           todo
          WHERE 
           todo LIKE "%${search_q}%";`
  }
  data = await db.all(getTodoQuery)
  if (data.length === 0) {
    response.status(400)
    response.send(`Invalid Todo ${columnUpdate}`)
  } else {
    response.send(data)
  }
})

//API 2

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  console.log(todoId)
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`
  const todos = await db.all(getTodoQuery)
  response.send(todos)
})

//API 3

const changeDueDateText = obj => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    status: obj.status,
    category: obj.category,
    dueDate: obj.due_date,
  }
}

app.get('/agenda', async (request, response) => {
  const {date} = request.query
  const formatDate = format(new Date(`"${date}"`), 'yyyy-MM-dd')
  const getTodo = `SELECT * FROM todo WHERE due_date = "${formatDate}";`
  const todos = await db.all(getTodo)
  if (todos.length === 0) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(todos.map(obj => changeDueDateText(obj)))
  }
})

//API 4

app.post('/todos/', async (request, response) => {
  // const bodyDetails = request.body
  const {id, todo, priority, status, category, dueDate} = request.body
  const createTodoQuery = `
    INSERT INTO
      todo (id, todo, priority, status, category, due_date)
    VALUES (
       ${id},
      "${todo}",
      "${priority}",
      "${status}",
      "${category}",
      "${dueDate}" 
    );`
  await db.run(createTodoQuery)
  response.send('Todo Successfully Added')
})

//API 5

app.put('/todos/:todoId/', async (request, response) => {
  let {todoId} = request.params
  const bodyDetails = request.body
  let updateColumn

  switch (true) {
    case bodyDetails.status !== undefined:
      updateColumn = 'Status'
      break
    case bodyDetails.priority !== undefined:
      updateColumn = 'Priority'
      break
    case bodyDetails.todo !== undefined:
      updateColumn = 'Todo'
      break
    case bodyDetails.category !== undefined:
      updateColumn = 'Category'
      break
    case bodyDetails.dueDate !== undefined:
      updateColumn = 'Due Date'
      break
  }

  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`
  const previousTodo = await db.get(previousTodoQuery)
  console.log(previousTodo)
  console.log(todoId)

  const {
    category = previousTodo.category,
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    dueDate = previousTodo.due_date,
  } = request.body
  console.log(dueDate)
  const statusUpdateQuery = `
  UPDATE
   todo 
  SET
   category = "${category}",
   priority = "${priority}",
   status = "${status}",
   todo = "${todo}",
   due_date = "${dueDate}"
  WHERE id = ${todoId};`
  await db.run(statusUpdateQuery)
  response.send(`${updateColumn} Updated`)
})

//API 6

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `
  DELETE FROM todo WHERE id = ${todoId};`
  await db.run(deleteQuery)
  response.send('Todo Deleted')
})
module.exports = app
