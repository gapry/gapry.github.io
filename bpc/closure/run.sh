#!/bin/sh

rm -f .out

g++ -o app.out main.cpp; ./app.out

scheme --batch-mode < main.scm
