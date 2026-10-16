const GAME_TIME_SECONDS = 60;
const QUESTION_LIMIT = 500;
const board = document.querySelector("#board");
const template = document.querySelector("#cardTemplate");
const levelSelect = document.querySelector("#level");
const modeSelect = document.querySelector("#mode");
const singleLabel = document.querySelector("#singleLabel");
const singleDanInput = document.querySelector("#singleDan");
const startButton = document.querySelector("#startBtn");
const message = document.querySelector("#message");
const scoreOutput = document.querySelector("#score");
const matchesOutput = document.querySelector("#matches");
const remainingOutput = document.querySelector("#remaining");

let questions = [];
let questionIndex = 0;
let score = 0;
let locked = false;
let answerTimeout = null;
let gameTimer = null;
let timeRemaining = GAME_TIME_SECONDS;
let gameActive = false;

function getDans() {
  const mode = modeSelect.value;
  if (mode === "single") {
    const dan = Number(singleDanInput.value);
    if (!Number.isInteger(dan) || dan < 1 || dan > 9) {
      singleDanInput.setCustomValidity("１から９までのだんをいれてね。");
      singleDanInput.reportValidity();
      return null;
    }
    singleDanInput.setCustomValidity("");
    return [dan];
  }
  if (mode === "2-5") return [2, 3, 4, 5];
  if (mode === "6-9") return [6, 7, 8, 9];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function createQuestions(dans) {
  const facts = [];
  const rounds = Math.ceil(QUESTION_LIMIT / (dans.length * 9));
  for (let round = 0; round < rounds; round += 1) {
    for (const dan of dans) {
      for (let multiplier = 1; multiplier <= 9; multiplier += 1) {
        facts.push({ dan, multiplier, answer: dan * multiplier });
      }
    }
  }

  return shuffle(facts).map((fact) => {
    const distractors = shuffle(
      Array.from({ length: 9 }, (_, index) => index + 1)
        .filter((multiplier) => multiplier !== fact.multiplier),
    ).slice(0, 3);
    return {
      ...fact,
      choices: shuffle([
        { answer: fact.answer, multiplier: fact.multiplier },
        ...distractors.map((multiplier) => ({
          answer: fact.dan * multiplier,
          multiplier,
        })),
      ]),
    };
  });
}

function renderArray(dan, multiplier) {
  const array = document.createElement("span");
  array.className = "answer-array";
  array.style.setProperty("--columns", String(multiplier));
  array.style.setProperty("--rows", String(dan));
  array.setAttribute("aria-label", `${dan}だん、${multiplier}れつ`);
  for (let row = 0; row < dan; row += 1) {
    for (let column = 0; column < multiplier; column += 1) {
      const item = document.createElement("span");
      item.className = "array-dot";
      array.append(item);
    }
  }
  return array;
}

function renderChoice(choice, index, question) {
  const element = template.content.firstElementChild.cloneNode(true);
  element.dataset.answer = String(choice.answer);
  element.setAttribute("aria-label", `${index + 1}ばん、${choice.answer}`);
  if (levelSelect.value === "beginner") {
    element.append(renderArray(question.dan, choice.multiplier));
  } else if (levelSelect.value === "advanced" && Math.random() < 0.5) {
    element.append(renderArray(question.dan, choice.multiplier));
  } else {
    const number = document.createElement("span");
    number.className = "answer-number";
    number.textContent = String(choice.answer);
    element.append(number);
  }
  element.addEventListener("click", () =>
    chooseAnswer(element, choice.answer, question.answer),
  );
  return element;
}

function showQuestion() {
  updateStats();
  if (!gameActive || questionIndex >= questions.length) {
    return;
  }

  const question = questions[questionIndex];
  const prompt = document.createElement("div");
  prompt.className = "question-prompt";
  const formula = document.createElement("span");
  formula.className = "formula";
  formula.setAttribute("aria-label", `${question.dan}かける${question.multiplier}`);
  formula.textContent = `${question.dan} × ${question.multiplier} ＝ ?`;
  prompt.append(formula, message);

  const choices = document.createElement("div");
  choices.className = "choices";
  choices.setAttribute("aria-label", "こたえをえらんでね");
  choices.append(...question.choices.map((choice, index) =>
    renderChoice(choice, index, question),
  ));
  board.replaceChildren(prompt, choices);
  message.hidden = true;
  message.textContent = "";
  message.classList.remove("is-finish");
  updateStats();
}

function chooseAnswer(element, answer, correctAnswer) {
  if (locked || !gameActive) return;
  locked = true;
  const buttons = board.querySelectorAll(".answer-card");
  buttons.forEach((button) => {
    button.disabled = true;
    if (Number(button.dataset.answer) === correctAnswer) {
      button.classList.add("is-correct");
    }
  });

  if (answer === correctAnswer) {
    score += 10;
    message.textContent = "せいかい！";
  } else {
    element.classList.add("is-wrong");
    message.textContent = `こたえは ${correctAnswer}`;
  }
  message.hidden = false;
  updateStats();
  answerTimeout = window.setTimeout(() => {
    answerTimeout = null;
    if (!gameActive) return;
    questionIndex += 1;
    locked = false;
    showQuestion();
  }, answer === correctAnswer ? 350 : 700);
}

function updateStats() {
  scoreOutput.textContent = String(score);
  matchesOutput.textContent = String(score / 10);
  remainingOutput.textContent = `${timeRemaining}びょう`;
}

function finishGame() {
  if (!gameActive) return;
  gameActive = false;
  locked = true;
  if (answerTimeout !== null) {
    window.clearTimeout(answerTimeout);
    answerTimeout = null;
  }
  if (gameTimer !== null) {
    window.clearInterval(gameTimer);
    gameTimer = null;
  }
  board.replaceChildren();
  message.classList.add("is-finish");
  message.textContent = `じかんぎれ！ とくてんは ${score}てんだよ。`;
  message.hidden = false;
  board.append(message);
}

function startGame() {
  const dans = getDans();
  if (!dans) return;

  if (answerTimeout !== null) {
    window.clearTimeout(answerTimeout);
    answerTimeout = null;
  }
  if (gameTimer !== null) {
    window.clearInterval(gameTimer);
    gameTimer = null;
  }
  questions = createQuestions(dans);
  questionIndex = 0;
  score = 0;
  locked = false;
  timeRemaining = GAME_TIME_SECONDS;
  gameActive = true;
  updateStats();
  showQuestion();
  gameTimer = window.setInterval(() => {
    timeRemaining -= 1;
    updateStats();
    if (timeRemaining <= 0) finishGame();
  }, 1000);
}

modeSelect.addEventListener("change", () => {
  singleLabel.hidden = modeSelect.value !== "single";
});
singleDanInput.addEventListener("input", () => singleDanInput.setCustomValidity(""));
startButton.addEventListener("click", startGame);
