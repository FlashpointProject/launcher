# Introduction

## Overview

The Configuration documentation is written from the perspective of someone wanting to use Flashpoint Launcher for their own project, and made using the knowledge of how it works for Flashpoint Archive.

[**config.json**](config) - `config.json` defines the most basic operation settings, such as path to the root data folder and some immutable options like logs server url and Game of the Day remote server url.

[**preferences.json**](preferences) - `preferences.json` defines user specific and data version specific settings like different folder paths, Browse page and Curate page settings. This page will explain how to set default preferences for the user, including when they delete their own preferences file.

[**Services**](services) - `/Data/services.json` defines the background services, and required server process that Games will need. This is fairly flexible and should fit your needs most of the time.

[**Shortcuts**](shortcuts) - Defined in `preferences.json` this covers all keyboard shortcuts in the Flashpoint Launcher. This is only relevant for the Curate page currently.

[**Credits**](credits) - `/Data/credits.json` defines the user details that appear on the about page. This should be specific to the people working on your project.
