let pointsUpper = [];
let pointsLower = [];
let obstacles = [];
let lives = 3;
let gameState = "START"; // START, PLAYING, GAMEOVER, WIN
let gameMode = "OBSTACLE"; // OBSTACLE, TIMER, COMPREHENSIVE
let numPoints;
let margin = 50;
let restartBtn, modeObsBtn, modeTimeBtn, modeCompBtn, fullScreenBtn;
let levelStartTime;
let currentTimeLimit = 15; 

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.style('display', 'block'); // 確保畫布不會產生多餘捲軸
  cursor(ARROW); // 確保系統游標可見
  
  // 建立重新開始按鈕
  restartBtn = createButton('重置遊戲');
  restartBtn.position(10, 10);
  restartBtn.mousePressed(() => initGame(gameMode));

  modeObsBtn = createButton('模式一：障礙物');
  modeObsBtn.position(10, 40);
  modeObsBtn.mousePressed(() => initGame("OBSTACLE"));

  modeTimeBtn = createButton('模式二：15秒限時');
  modeTimeBtn.position(10, 70);
  modeTimeBtn.mousePressed(() => initGame("TIMER"));

  modeCompBtn = createButton('模式三：綜合挑戰');
  modeCompBtn.position(10, 100);
  modeCompBtn.mousePressed(() => initGame("COMPREHENSIVE"));

  fullScreenBtn = createButton('全螢幕切換');
  fullScreenBtn.position(10, 130);
  fullScreenBtn.mousePressed(() => fullscreen(!fullscreen()));
  
  initGame("OBSTACLE");
}

function windowResized() {
  // 當視窗大小改變時，重新調整畫布並重置遊戲以適應新尺寸
  resizeCanvas(windowWidth, windowHeight);
  initGame(gameMode);
}

function initGame(mode) {
  lives = 3;
  gameMode = mode;
  currentTimeLimit = (mode === "COMPREHENSIVE") ? 25 : 15; // 第三關(綜合)25秒，其他15秒
  pointsUpper = [];
  pointsLower = [];
  obstacles = [];
  numPoints = floor(random(15, 31)); // 15-30個點
  
  let xStep = (width - 2 * margin) / (numPoints - 1);
  let lastY = height / 2;

  for (let i = 0; i < numPoints; i++) {
    let px = margin + i * xStep;
    // 隨機產生Y座標，並確保離邊緣有距離
    let py = lastY + random(-50, 50);
    py = constrain(py, margin + 60, height - margin - 60);
    
    // 上邊界點
    pointsUpper.push({x: px, y: py});
    
    // 根據需求：粗細(通道寬度)在 40-70 之間
    let gap = random(40, 70); 
    pointsLower.push({x: px, y: py + gap});

    lastY = py;
  }

  // 模式一或綜合模式：確保至少產生 3 個障礙物小方塊
  if (gameMode === "OBSTACLE" || gameMode === "COMPREHENSIVE") {
    let attempts = 0;
    while (obstacles.length < 3 && attempts < 100) {
      let idx = floor(random(3, numPoints - 3));
      let px = pointsUpper[idx].x;
      let pyUpper = pointsUpper[idx].y;
      let pyLower = pointsLower[idx].y;
      
      // 檢查是否已存在障礙物，避免重複放置
      if (!obstacles.find(o => o.x === px)) {
        let baseY = (pyUpper + pyLower) / 2;
        obstacles.push({
          x: px, 
          y: baseY, 
          baseY: baseY, 
          size: 15,
          range: (pyLower - pyUpper) * 0.3 // 移動範圍限制在通道高度的 30%
        });
      }
      attempts++;
    }
  }
  
  gameState = "START";
  cursor(ARROW);
}

function draw() {
  background(220);
  
  // 計算路徑顏色 (警告效果)
  let pathColor = color(50);
  let timeProgress = 0;
  let elapsed = 0;

  if ((gameMode === "TIMER" || gameMode === "COMPREHENSIVE") && gameState === "PLAYING") {
    elapsed = (millis() - levelStartTime) / 1000;
    timeProgress = constrain(elapsed / currentTimeLimit, 0, 1);
    pathColor = lerpColor(color(50), color(255, 0, 0), timeProgress);
  }

  // 1. 先繪製底層路徑與遊戲主體
  if (gameState === "START") {
    drawPath(pathColor);
    drawUI("點擊畫面並移動到綠色起點開始遊戲", color(0));
    if (mouseIsPressed) {
      if (dist(mouseX, mouseY, pointsUpper[0].x, (pointsUpper[0].y + pointsLower[0].y)/2) < 30) {
        levelStartTime = millis();
        gameState = "PLAYING";
      }
    }
  } else if (gameState === "PLAYING") {
    drawPath(pathColor);
    checkCollision();
    
    // 檢查是否到達終點
    if (mouseX > pointsUpper[numPoints-1].x) {
      gameState = "WIN";
    }
  } else if (gameState === "GAMEOVER") {
    cursor(ARROW);
    drawPath(pathColor);
    drawUI("碰撞失敗！請重新開始", color(255, 0, 0));
  } else if (gameState === "WIN") {
    cursor(ARROW);
    drawPath(pathColor);
    drawUI("恭喜過關！", color(0, 150, 0));
  }

  // 2. 繪製 HUD (生命值、模式、計時器)，確保不被路徑遮住
  fill(0);
  textAlign(LEFT);
  textSize(16);
  text("生命值: " + "❤️".repeat(max(0, lives)), 10, 175);
  
  let modeDesc = "障礙物";
  if (gameMode === "TIMER") modeDesc = "15秒限時";
  if (gameMode === "COMPREHENSIVE") modeDesc = "綜合挑戰";
  text("目前模式: " + modeDesc, 10, 195);

  if ((gameMode === "TIMER" || gameMode === "COMPREHENSIVE") && gameState === "PLAYING") {
    let remaining = max(0, currentTimeLimit - elapsed);
    fill(remaining < 5 ? color(255, 0, 0) : 0);
    text("剩餘時間: " + remaining.toFixed(2) + "s", 10, 215);
    
    if (remaining <= 0) {
      handleFailure();
    }
  }

  // 3. 最後繪製滑鼠追蹤圓圈 (確保在圖層最上層)
  if (gameState === "PLAYING") {
    cursor(ARROW); // 確保在遊戲中游標也是顯示的
    fill(0, 0, 255, 150);
    noStroke();
    ellipse(mouseX, mouseY, 10);
  }
}

function drawPath(pathColor) {
  // 繪製路徑通道
  noFill();
  strokeWeight(3);
  
  stroke(pathColor);
  beginShape();
  for (let p of pointsUpper) {
    vertex(p.x, p.y);
  }
  endShape();
  
  beginShape();
  for (let p of pointsLower) {
    vertex(p.x, p.y);
  }
  endShape();

  // 繪製障礙物小方塊
  fill(255, 0, 0);
  noStroke();
  rectMode(CENTER);
  for (let obs of obstacles) {
    // 綜合模式下，障礙物會隨時間上下移動
    if (gameMode === "COMPREHENSIVE" && gameState === "PLAYING") {
      obs.y = obs.baseY + sin(frameCount * 0.08) * obs.range;
    }
    rect(obs.x, obs.y, obs.size, obs.size);
  }
  rectMode(CORNER);

  // 繪製起點與終點區域
  noStroke();
  fill(0, 255, 0, 100); // 起點綠色
  rect(pointsUpper[0].x - 10, pointsUpper[0].y, 20, pointsLower[0].y - pointsUpper[0].y);
  
  fill(255, 215, 0, 100); // 終點金色
  rect(pointsUpper[numPoints-1].x - 10, pointsUpper[numPoints-1].y, 20, pointsLower[numPoints-1].y - pointsUpper[numPoints-1].y);
  
  fill(0);
  textSize(14);
  textAlign(LEFT);
  text("START", pointsUpper[0].x - 10, pointsUpper[0].y - 10);
  text("END", pointsUpper[numPoints-1].x - 10, pointsUpper[numPoints-1].y - 10);
}

function handleFailure() {
  lives--;
  if (lives <= 0) {
    gameState = "GAMEOVER";
  } else {
    // 震動效果或提示後回到起點
    gameState = "START"; 
    levelStartTime = millis();
  }
}

function checkCollision() {
  // 1. 檢查是否超出畫布
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
    handleFailure();
    return;
  }

  // 2. 檢查是否碰到障礙物方塊 (模式一或綜合模式)
  if (gameMode === "OBSTACLE" || gameMode === "COMPREHENSIVE") {
    for (let obs of obstacles) {
      if (mouseX > obs.x - obs.size/2 && mouseX < obs.x + obs.size/2 &&
          mouseY > obs.y - obs.size/2 && mouseY < obs.y + obs.size/2) {
        handleFailure();
        return;
      }
    }
  }

  // 3. 找到滑鼠當前所在的線段區間 (檢查邊界)
  let i = 0;
  while (i < numPoints - 1 && mouseX > pointsUpper[i+1].x) {
    i++;
  }
  
  if (i < numPoints - 1) {
    // 使用線性插值計算當前 X 座標對應的上下邊界 Y 值
    let x1 = pointsUpper[i].x;
    let x2 = pointsUpper[i+1].x;
    let pct = (mouseX - x1) / (x2 - x1);
    
    let upperY = lerp(pointsUpper[i].y, pointsUpper[i+1].y, pct);
    let lowerY = lerp(pointsLower[i].y, pointsLower[i+1].y, pct);
    
    // 如果滑鼠 Y 不在上下邊界之間，則碰撞
    if (mouseY <= upperY || mouseY >= lowerY) {
      handleFailure();
    }
  }
}

function drawUI(msg, textColor) {
  textAlign(CENTER, CENTER);
  fill(255, 200);
  noStroke();
  rect(width/2 - 200, height/2 - 40, 400, 80, 10);
  
  fill(textColor);
  textSize(20);
  text(msg, width / 2, height / 2);
}
