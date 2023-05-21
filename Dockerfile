# This dockerfile is used to publish the `ohif/viewer` image on dockerhub.
#
# It's a good example of how to build our static application and package it
# with a web server capable of hosting it as static content.
#
# docker build
# --------------
# If you would like to use this dockerfile to build and tag an image, make sure
# you set the context to the project's root directory:
# https://docs.docker.com/engine/reference/commandline/build/
#
#
# SUMMARY
# --------------
# This dockerfile has two stages:
#
# 1. Building the React application for production
# 2. Setting up our Nginx (Alpine Linux) image w/ step one's output
#


# Stage 1: Build the application
# docker build -t ohif/viewer:latest .
FROM node:16.15.0-slim as json-copier

RUN mkdir /usr/src/app
WORKDIR /usr/src/app

COPY ["package.json", "yarn.lock", "preinstall.js", "./"]
COPY extensions /usr/src/app/extensions
COPY modes /usr/src/app/modes
COPY platform /usr/src/app/platform

# Find and remove non-package.json files
#RUN find extensions \! -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf
#RUN find modes \! -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf
#RUN find platform \! -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf

# Copy Files
FROM node:16.15.0-slim as builder
RUN mkdir /usr/src/app
WORKDIR /usr/src/app

COPY --from=json-copier /usr/src/app .

# Run the install before copying the rest of the files
RUN yarn config set workspaces-experimental true
RUN yarn install --frozen-lockfile --verbose

COPY . .

# To restore workspaces symlinks
RUN yarn install --frozen-lockfile --verbose

ENV PATH /usr/src/app/node_modules/.bin:$PATH
ENV QUICK_BUILD true
# ENV GENERATE_SOURCEMAP=false
# ENV REACT_APP_CONFIG=config/default.js

RUN yarn run build

COPY --from=builder /usr/src/app/platform/viewer/dist ./dist
RUN yarn global add serve
CMD ["serve", "-s", "dist", "-l", "5000"]

# Expose the container port
EXPOSE 5000
