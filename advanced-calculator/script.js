document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const mainDisplay = document.querySelector('.main-display');
    const historyDisplay = document.querySelector('.history-display');
    const calculatorGrid = document.querySelector('.calculator-grid');

    // State Variables
    let currentExpression = '';
    let result = '';
    let memory = 0;

    // --- Event Handling ---
    calculatorGrid.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;

        const button = e.target;
        const value = button.dataset.value;
        const action = button.dataset.action;

        handleInput(value, action);
        updateDisplay();
    });

    // --- Input Logic ---
    function handleInput(value, action) {
        if (action) {
            handleAction(action);
        } else if (value) {
            handleValue(value);
        }
    }

    function handleAction(action) {
        switch (action) {
            case 'equals':
                if (currentExpression === '') return;
                try {
                    result = evaluateExpression(currentExpression);
                    historyDisplay.textContent = currentExpression + ' =';
                    currentExpression = result.toString();
                } catch (error) {
                    result = 'Error';
                    historyDisplay.textContent = '';
                    currentExpression = result;
                }
                break;
            case 'clear-all':
                currentExpression = '';
                result = '';
                historyDisplay.textContent = '';
                break;
            case 'backspace':
                currentExpression = currentExpression.slice(0, -1);
                break;
            case 'toggle-sign':
                // This is a simplified implementation. A more robust one would parse the last number.
                if(currentExpression.startsWith('-')) {
                    currentExpression = currentExpression.substring(1);
                } else {
                    currentExpression = '-' + currentExpression;
                }
                break;
        }
    }

    function handleValue(value) {
        if (result === 'Error') {
             currentExpression = '';
             result = '';
        }

        // Special handling for memory and constants
        const memoryActions = {
            'M+': () => memory += parseFloat(evaluateExpression(currentExpression || '0')),
            'MR': () => currentExpression += memory.toString(),
            'MC': () => memory = 0,
        };
        
        if (memoryActions[value]) {
            try {
                 if (value === 'MR') {
                    memoryActions[value]();
                 } else {
                    memoryActions[value]();
                    historyDisplay.textContent = `Memory: ${memory}`;
                 }
            } catch {
                result = 'Error';
                currentExpression = result;
            }
            return;
        }

        const constants = {
            'pi': Math.PI,
            'e': Math.E
        };

        if (constants[value]) {
            currentExpression += constants[value];
            return;
        }

        // Append value to expression
        currentExpression += value;
    }

    // --- Display Update ---
    function updateDisplay() {
        mainDisplay.textContent = currentExpression || '0';
    }

    // --- Calculation Engine (Shunting-yard Algorithm) ---

    function evaluateExpression(expression) {
        // 1. Tokenize the expression
        const tokens = tokenize(expression);
        // 2. Convert from infix to postfix (RPN) using Shunting-yard
        const rpn = shuntingYard(tokens);
        // 3. Evaluate the RPN expression
        const result = evaluateRPN(rpn);

        // Round to a reasonable number of decimal places
        return Math.round(result * 1e12) / 1e12;
    }
    
    // Tokenizer: Breaks the expression string into numbers, operators, and functions
    function tokenize(expression) {
        // Add spaces around operators to make splitting easier, but not for scientific notation 'e'
        const regex = /([\+\-\*\/\^\(\)])|(?<!e)-/g;
        expression = expression.replace(regex, ' $1 ');
        
        // Handle functions like sin, cos, etc.
        const funcRegex = /(sin|cos|tan|log|ln|sqrt|!)/g;
        expression = expression.replace(funcRegex, ' $1 ');

        return expression.trim().split(/\s+/);
    }

    // Shunting-yard algorithm implementation
    function shuntingYard(tokens) {
        const outputQueue = [];
        const operatorStack = [];
        const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
        const associativity = { '^': 'right' };
        const functions = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', '!'];

        tokens.forEach(token => {
            if (!isNaN(parseFloat(token))) { // If it's a number
                outputQueue.push(parseFloat(token));
            } else if (functions.includes(token)) {
                operatorStack.push(token);
            } else if (token in precedence) { // If it's an operator
                while (
                    operatorStack.length > 0 &&
                    operatorStack[operatorStack.length - 1] !== '(' &&
                    (precedence[operatorStack[operatorStack.length - 1]] > precedence[token] ||
                    (precedence[operatorStack[operatorStack.length - 1]] === precedence[token] && associativity[token] !== 'right'))
                ) {
                    outputQueue.push(operatorStack.pop());
                }
                operatorStack.push(token);
            } else if (token === '(') {
                operatorStack.push(token);
            } else if (token === ')') {
                while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
                    outputQueue.push(operatorStack.pop());
                }
                if (operatorStack[operatorStack.length - 1] === '(') {
                    operatorStack.pop(); // Pop the '('
                }
                if(functions.includes(operatorStack[operatorStack.length - 1])){
                     outputQueue.push(operatorStack.pop());
                }
            }
        });

        while (operatorStack.length > 0) {
            outputQueue.push(operatorStack.pop());
        }

        return outputQueue;
    }

    // RPN (Reverse Polish Notation) evaluator
    function evaluateRPN(rpnTokens) {
        const stack = [];

        rpnTokens.forEach(token => {
            if (typeof token === 'number') {
                stack.push(token);
            } else {
                // It's an operator or function
                if (token === 'sin' || token === 'cos' || token === 'tan' || token === 'log' || token === 'ln' || token === 'sqrt' || token === '!') {
                    const operand = stack.pop();
                    if (operand === undefined) throw new Error("Syntax Error");
                    stack.push(calculateFunction(token, operand));
                } else {
                    const b = stack.pop();
                    const a = stack.pop();
                    if (a === undefined || b === undefined) throw new Error("Syntax Error");
                    stack.push(calculateOperation(token, a, b));
                }
            }
        });

        if (stack.length !== 1) throw new Error("Syntax Error");
        return stack[0];
    }

    function calculateOperation(operator, a, b) {
        switch (operator) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/':
                if (b === 0) throw new Error("Division by zero");
                return a / b;
            case '^': return Math.pow(a, b);
        }
    }

    function calculateFunction(func, operand) {
        switch (func) {
            case 'sin': return Math.sin(operand * Math.PI / 180); // Assuming degree input
            case 'cos': return Math.cos(operand * Math.PI / 180); // Assuming degree input
            case 'tan': return Math.tan(operand * Math.PI / 180); // Assuming degree input
            case 'log': return Math.log10(operand);
            case 'ln': return Math.log(operand);
            case 'sqrt': return Math.sqrt(operand);
            case '!': return factorial(operand);
        }
    }
    
    function factorial(n) {
        if (n < 0) throw new Error("Factorial of negative number is undefined");
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

});