// Import express, Sequelize, and models
const express = require('express');
const cors = require('cors'); // Import the CORS middleware
const { Sequelize, DataTypes } = require('sequelize');

// Initialize the Express app
const app = express();

// Middleware to parse JSON requests
app.use(express.json());
// Enable CORS for all routes
app.use(cors());


// Initialize Sequelize and connect to SQLite database
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.db',  // Path to your SQLite database file
    logging: false,  // Turn off logging
});

// Define the Category model
const Category = sequelize.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    timestamps: false,  // We don't need Sequelize to manage createdAt/updatedAt
});

// Define the Expense model
const Expense = sequelize.define('Expense', {
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        defaultValue: Sequelize.NOW,  // Set default date as current date
    },
}, {
    timestamps: false,  // We don't need Sequelize to manage createdAt/updatedAt
});

// Define the relationship between Category and Expense
Expense.belongsTo(Category, { foreignKey: 'categoryId' }); // Expense belongs to a Category
Category.hasMany(Expense, { foreignKey: 'categoryId' }); // A Category can have many Expenses

// Sync Sequelize models with the database
sequelize.sync({ force: false })  // Set `force: true` to drop and recreate tables
    .then(() => console.log("Database synchronized"))
    .catch(err => console.error("Error syncing database:", err));

// Define a port
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello, Express API!');
});




// ------------------- Category Routes -------------------

// Get all categories
app.get('/categories', async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new category
app.post('/categories', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    // Check if a category with the same name already exists
    const existingCategory = await Category.findOne({ where: { name } });
            
    if (existingCategory) {
        return res.status(400).json({ error: 'Category with this name already exists' });
    }
    try {
        const category = await Category.create({ name });
        res.status(201).json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update an existing category
app.put('/categories/:id', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }

    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        category.name = name;
        await category.save();
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a category
app.delete('/categories/:id', async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        // Check if there are any expenses associated with this category
        const expensesCount = await Expense.count({ where: { categoryId: req.params.id } });
        if (expensesCount > 0) {
            return res.status(400).json({ error: 'Category has associated expenses. Deletion declined.' });
        }

        await category.destroy();
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------- Expense Routes -------------------

// Get all expenses
app.get('/expenses', async (req, res) => {
    try {
        const expenses = await Expense.findAll({
            include: Category,  // Include the Category model in the response
        });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a single expense by ID
app.get('/expenses/:id', async (req, res) => {
    try {
        const expense = await Expense.findByPk(req.params.id, {
            include: Category,  // Include the Category model in the response
        });
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new expense
app.post('/expenses', async (req, res) => {
    const { amount, description, categoryId,date } = req.body;

    const vailddate=new Date(date)

    // Ensure the category exists before creating the expense
    const category = await Category.findByPk(categoryId);
    if (!category) {
        return res.status(400).json({ error: 'Category not found' });
    }

    try {
        const expense = await Expense.create({ amount, description, categoryId ,date: vailddate});
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update an existing expense
app.put('/expenses/:id', async (req, res) => {
    const { amount, description, categoryId, date } = req.body;

    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Ensure the category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(400).json({ error: 'Category not found' });
        }

        expense.amount = amount || expense.amount;
        expense.description = description || expense.description;
        expense.categoryId = categoryId || expense.categoryId;
        expense.date = date || expense.date;  // Only update date if provided

        await expense.save();
        res.json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an expense
app.delete('/expenses/:id', async (req, res) => {
    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        await expense.destroy();
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
