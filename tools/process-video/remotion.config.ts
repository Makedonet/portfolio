import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
// Шрифты — те же файлы, что у сайта.
Config.setPublicDir("../../src/assets/fonts");
