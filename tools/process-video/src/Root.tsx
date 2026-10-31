import React from "react";
import { Composition } from "remotion";
import { Step1Talk } from "./Step1Talk";
import { Step2Plan } from "./Step2Plan";
import { Step3Design } from "./Step3Design";
import { Step4Build } from "./Step4Build";
import { Step5Launch } from "./Step5Launch";

const FPS = 30;
// Кадр 3:2: и в полосе на компьютере, и в столбце на телефоне. Рисуется в
// 1200×800, выводится в 1,2 раза крупнее (см. render.mjs).
const SIZE = { width: 1200, height: 800, fps: FPS };

export const STEPS = [
  { id: "step-1-talk", component: Step1Talk, seconds: 10.4 },
  { id: "step-2-plan", component: Step2Plan, seconds: 10.3 },
  { id: "step-3-design", component: Step3Design, seconds: 10.3 },
  { id: "step-4-build", component: Step4Build, seconds: 10.5 },
  { id: "step-5-launch", component: Step5Launch, seconds: 10.6 },
];

export const RemotionRoot: React.FC = () => (
  <>
    {STEPS.map(({ id, component, seconds }) => (
      <Composition key={id} id={id} component={component} durationInFrames={Math.round(seconds * FPS)} {...SIZE} />
    ))}
  </>
);
