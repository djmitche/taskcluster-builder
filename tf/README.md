# Terraform Setup

The terraform HCL in tihs directory sets up the resources required to run
Packer as part of the build process.

## Running

To run the terraform here, first source `setup.sh`:

```sh
source setup.sh
```

This will:

* read `build-config.yml` and (optionally) `user-build-config.yml` from the parent directory
* login to the necessary cloud provider accounts
* set and export several `TF_var_..` environment variables in your shell.
