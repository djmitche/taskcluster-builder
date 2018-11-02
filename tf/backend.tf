# This bucket was initially created by hand, and then imported.  Note that
# backends can't be configured by variables, so if you want to use a different
# backend (for example, to run this outside of the Taskcluster team), you will
# need to modify this file in-place.

terraform {
  backend "gcs" {
    bucket = "taskcluster-builder-tfstate"
    prefix = "state"
  }
}

resource "google_storage_bucket" "backend" {
  name          = "taskcluster-builder-tfstate"
  storage_class = "REGIONAL"
  location      = "us-east1"
  project       = "${var.gcp_project}"
}
