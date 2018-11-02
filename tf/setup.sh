msg() {
    local level="${1}"
    shift

    local _esc=$'\033'
    local normal="$_esc[0m"

    case $level in
        # don't display debug messages unless DEBUG is set
        debug) [ -z "$DEBUG" ] && return ;;
        info) local color="$_esc[0;36m" ;;
        warn*) local color="$_esc[1;33m" ;;
        err*) local color="$_esc[1;31m" ;;
    esac

    echo "$color${@}$normal" >&2
}

get-config() {
    (cd .. && node <<EOF
const config = require('typed-env-config');
const cfg = config({
  files: [
    'build-config.yml',
    'user-build-config.yml',
  ],
  env:      process.env,
});
const val = cfg.$1;
if (val) {
  process.stdout.write(val.toString());
} else {
  console.error('No configuration for $1');
}
EOF
)
}

if ! gcloud auth print-access-token >/dev/null 2>/dev/null; then
    msg warning 'Google Cloud login required'
    msg info "Enter credentials for the Google account associated with ${DEPLOYMENT}"
    gcloud auth login
fi
if ! gcloud auth application-default print-access-token >/dev/null 2>/dev/null; then
    msg warning 'Google Cloud ADC login required (yes, sorry, two logins)'
    gcloud auth application-default login
fi
msg info 'Google Cloud setup complete'

export TF_VAR_gcp_project="$(get-config workers.gcp.project)"
export TF_VAR_gcp_folder_id="$(get-config workers.gcp.folder)"
export TF_VAR_gcp_billing_account_id="$(get-config workers.gcp.billingAccount)"
export TF_VAR_gcp_users="$(get-config workers.gcp.users)"
