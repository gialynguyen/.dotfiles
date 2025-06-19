#!/usr/bin/env node

const { execSync } = require("child_process");

async function main() {
  const activeWS = serializeBufferOutput(execSync(`flashspace get-workspace`));

  const appsInWS = serializeBufferOutput(
    execSync(`flashspace list-apps ${activeWS} --only-running`),
  ).split("\n");

  const listDisplays = serializeBufferOutput(
    execSync(`flashspace list-displays`),
  ).split("\n");

  const activeDisplay = serializeBufferOutput(
    execSync(`flashspace get-display`),
  );

  const indexOfActive = listDisplays.indexOf(activeDisplay);
  const nextDisplay = listDisplays[(indexOfActive + 1) % listDisplays.length];

  execSync(
    `flashspace update-workspace --active-workspace --display="${nextDisplay}"`,
  );

  await sleep(1000);

  for (const app of appsInWS) {
    execSync(`flashspace unassign-app --name ${app}`);
    sleep(1000);
    execSync(
      `flashspace assign-app --name ${app} --workspace ${activeWS} --show-notification --activate true`,
    );
  }
}

main();

function serializeBufferOutput(buffer) {
  return buffer.toString("utf8").trim();
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
