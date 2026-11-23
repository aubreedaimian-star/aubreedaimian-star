const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'workshop-5');
const scriptPath = path.join(root, 'first.js');

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

test('Workshop 5 builds the two messages from the course exercise', () => {
  const { buildMessages } = require(scriptPath);

  assert.deepEqual(buildMessages(), [
    '*********** My First Node.JS Program ***********',
    'Welcome to your first node program',
  ]);
});

test('Workshop 5 runner prints the title and welcome message', () => {
  const { run } = require(scriptPath);
  const output = [];

  run({ log: (value) => output.push(stripAnsi(value)) });

  assert.deepEqual(output, [
    '*********** My First Node.JS Program ***********',
    'Welcome to your first node program',
  ]);
});
