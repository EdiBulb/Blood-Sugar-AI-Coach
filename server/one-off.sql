-- server/one-off.sql (임시 실행용) 
ALTER TABLE logs ADD COLUMN note TEXT;

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id=1),
  goals TEXT,        -- "유지 목표, 합병증 우려, 주당 운동빈도…" 등 자유서술
  diet TEXT,         -- 식습관: 저탄수/일반/간식 패턴, 음주 등
  exercise TEXT,     -- 운동: 주당 빈도/시간/유형
  target_min INTEGER, -- 유지 목표 하한 (mg/dL)
  target_max INTEGER  -- 유지 목표 상한 (mg/dL)
);

INSERT OR IGNORE INTO profile (id, goals, diet, exercise, target_min, target_max)
VALUES (1, '', '', '', 80, 140);
