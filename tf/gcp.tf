variable "gcp_project" {
  type        = "string"
  description = "Project in Google Cloud."
}

variable "gcp_folder_id" {
  type        = "string"
  description = "Numeric ID of the folder in which to create the GCP project."
}

variable "gcp_billing_account_id" {
  type        = "string"
  description = "Billing account this project should bill to"
}

variable "gcp_users" {
  type        = "string"
  description = "Users with access to this project, as a comma-separated string"
}

##
# Set up a GCP project

resource "google_project" "project" {
  name            = "${var.gcp_project}"
  project_id      = "${var.gcp_project}"
  folder_id       = "${var.gcp_folder_id}"
  billing_account = "${var.gcp_billing_account_id}"
}

resource "google_project_service" "project_compute" {
  project = "${google_project.project.id}"
  service = "compute.googleapis.com"
}

##
# Give team members access to the project

locals {
  team_members = ["${split(",", var.gcp_users)}"]
}

resource "google_project_iam_member" "team_members" {
  project = "${google_project.project.id}"
  role    = "roles/editor"
  count   = "${length(local.team_members)}"
  member  = "${local.team_members[count.index]}"
}

##
# Set up the service account and associated roles for the image-building operation
#
# The roles are based on
# https://www.packer.io/docs/builders/googlecompute.html#running-without-a-compute-engine-service-account

resource "google_service_account" "taskcluster_builder" {
  project      = "${google_project.project.id}"
  account_id   = "taskcluster-builder"
  display_name = "taskcluster-builder service account"
}

resource "google_project_iam_member" "taskcluster_builder_instance_admin_v1" {
  project = "${google_project.project.id}"
  member  = "serviceAccount:${google_service_account.taskcluster_builder.email}"
  role    = "roles/compute.instanceAdmin.v1"
}

resource "google_project_iam_member" "taskcluster_builder_service_account_user" {
  project = "${google_project.project.id}"
  member  = "serviceAccount:${google_service_account.taskcluster_builder.email}"
  role    = "roles/iam.serviceAccountUser"
}

##
# Generate a key for the service account.  This goes in user-build-config.yml as gcp.builderKey.

resource "google_service_account_key" "builder_key" {
  service_account_id = "${google_service_account.taskcluster_builder.name}"
}

data "google_service_account_key" "builder_key" {
  service_account_id = "${google_service_account_key.builder_key.name}"
  public_key_type    = "TYPE_X509_PEM_FILE"
}

output "builder_key" {
  value = "${base64decode(google_service_account_key.builder_key.private_key)}"
}
