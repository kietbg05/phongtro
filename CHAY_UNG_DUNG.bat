@echo off
title Khoi Chay He Thong Quan Ly Phong Tro
echo ---------------------------------------------------
echo DANG KHOI CHAY SERVER QUAN LY PHONG TRO...
echo ---------------------------------------------------
echo 1. Hay dam bao ban da bat XAMPP (Apache va MySQL)
echo 2. Web se mo tai: http://localhost:3000/login.html
echo ---------------------------------------------------
cd /d %~dp0
node server/server.js
pause
