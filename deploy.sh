#!/bin/bash

source ~/.nvm/nvm.sh && (node ~/mono-scraper/app.js >> /var/log/scraper/$(date +%Y%m%d-%H%M).log 2>&1)