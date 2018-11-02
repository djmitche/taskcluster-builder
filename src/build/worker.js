const _ = require('lodash');
const util = require('util');
const fs = require('fs');
const path = require('path');
const {genericWorkerTasks} = require('./worker/generic-worker');

const generateWorkerTasks = ({tasks, baseDir, spec, cfg, name, cmdOptions}) => {
  const repository = _.find(spec.build.repositories, {name});
  const workDir = path.join(baseDir, `worker-${name}`);
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  }

  switch (repository.worker.implementation) {
    case 'generic-worker':
      genericWorkerTasks({tasks, baseDir, spec, cfg, name, cmdOptions, repository, workDir});
      break;

    default:
      throw new Error(`Unknown worker.implementation ${repository.worker.implementation}`);
  }
};

module.exports = generateWorkerTasks;
