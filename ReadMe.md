# Agent Transparency Tool [Desktop Application]

__`Author`: `Fahid RM`__

__`Email`: `frm24@bath.ac.uk`__

Visual Transparency Tool for Multi-Agent Systems.

Project Page & Guides: https://fahidrm.github.io/agent-transparency-tool

Quick Overview video: https://fahidrm.github.io/agent-transparency-tool/files/aamas2021vid_video_25.mp4





#### 1.0. Installation

You may use the pre-built app (see [release tab](https://github.com/fahidRM/agent-transparency-tool/releases)) or build this repository using the guide below (see section: `Running & Building`).

#### 2.0. How to use

1. Launch app.
2. Click the `Start Debugging` button. This would open a socket that listens at port `3000`.
3. Launch you multi-agent system that has been configured to make log states as `JSON` as defined [here](http://).
4. If your `MAS`  consists of multiple agents, use the selector to choose between agents. While no agent has been chosen, the app chooses the first agent that logs its state.

![Screenshot](https://github.com/fahidRM/agent-debugger/blob/migrating-web-code/docs/debugger.png)

#### 3.0. Running &amp; Building

##### 3.1. Implementation Summary
- `Language`: `Javascript ES 6`
- `Framework`: `Angular JS v 1.0`
- `Platform`: `Node JS`, `electron`

##### 3.2. System requirements
- `node`: `v 12.18.3 or later`
- `npm`: `v 6.14.6 or later`

##### 3.3. Project dependencies
see `package.json` (no action required)

All other dependencies have been bundled along with the source code. These are:
`Angular JS v1`, `d3.js v6.5`, `jQuery v3.2.1`, `lodash v4.0.0` & `Photon Kit`.


##### 3.4. Running project from source code

1. Clone or download this repository.
2. Use the `terminal` or `command prompt` to navigate to the project's root directory.
3. Using the `terminal` or `command prompt`, run the command `npm install`
4. After all the project's dependencies have been installed, run the command `npm start`

##### 3.5. Building project from source code

`Option 1`: To build this project we have included helper scripts in the `package.json` file. These are:

- `build-all`: builds project for all platforms.
- `build-lin`: builds project for linux.
- `build-mac`: builds project for macOS.
- `build-win`: builds project for windows.
  
  
   These helper scripts may be run using the command:
    `npm run [command]` i.e `npm run build-mac`
   

 `Option 2`: You may choose to use the `electron-packager` to build this project as discussed [on npm](https://www.npmjs.com/package/electron-packager).

`Note`: If you are developing on Windows, we suggest `option 2` as `option 1` includes the use of the `rm` command which is unavailable on Windows.

#### 4.0. Acknowledgement

- [Photon Kit](https://github.com/connors/photon) : Base CSS styling used. Released under MIT license.

#### 5.0. License

MIT

  
