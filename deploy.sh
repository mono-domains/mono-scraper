#!/bin/bash

source ~/.nvm/nvm.sh
node ~/mono-scraper/app.js 2>&1 | tee /var/log/scraper/$(date +%Y%m%d-%H%M).log