#include "cloud_phone.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "config_expand.h"
#include "../util/log.h"

#define SC_CLOUD_PHONE_CAPABILITIES_FLAG "--cloud-phone-capabilities"
#define SC_CLOUD_PHONE_CONFIG_FLAG "--cloud-phone-config="

bool
sc_cloud_phone_should_print_capabilities(int argc, char *argv[]) {
    for (int i = 1; i < argc; ++i) {
        if (!strcmp(argv[i], SC_CLOUD_PHONE_CAPABILITIES_FLAG)) {
            return true;
        }
    }

    return false;
}

void
sc_cloud_phone_print_capabilities(void) {
    const char *capabilities_path = getenv("CLOUD_PHONE_SCRCPY_CAPABILITIES");

    if (capabilities_path) {
        FILE *file = fopen(capabilities_path, "r");

        if (file) {
            char buffer[4096];

            while (fgets(buffer, sizeof(buffer), file)) {
                fputs(buffer, stdout);
            }

            fclose(file);
            return;
        }

        LOGW("Could not read capabilities file: %s", capabilities_path);
    }

    printf("{\"integration\":\"cloud-phone\",\"capabilities\":\"see backend/node/src/services/scrcpy/capabilities.js\"}\n");
}

static bool
find_config_path(int argc, char *argv[], char *path_out, size_t path_size) {
    for (int i = 1; i < argc; ++i) {
        const size_t prefix_len = strlen(SC_CLOUD_PHONE_CONFIG_FLAG);

        if (!strncmp(argv[i], SC_CLOUD_PHONE_CONFIG_FLAG, prefix_len)) {
            strncpy(path_out, argv[i] + prefix_len, path_size);
            path_out[path_size - 1] = '\0';
            return true;
        }
    }

    const char *env_path = getenv("CLOUD_PHONE_SCRCPY_CONFIG");

    if (env_path && env_path[0]) {
        strncpy(path_out, env_path, path_size);
        path_out[path_size - 1] = '\0';
        return true;
    }

    return false;
}

bool
sc_cloud_phone_prepare_argv(int argc, char *argv[],
                            int *effective_argc, char ***effective_argv,
                            char ***allocated_argv) {
    char config_path[1024];

    if (!find_config_path(argc, argv, config_path, sizeof(config_path))) {
        *effective_argc = argc;
        *effective_argv = argv;
        *allocated_argv = NULL;
        return true;
    }

    return sc_cloud_phone_build_effective_argv(argc, argv, config_path,
                                               effective_argc, effective_argv,
                                               allocated_argv);
}

void
sc_cloud_phone_release_argv(char **allocated_argv, int effective_argc) {
    (void) effective_argc;
    sc_cloud_phone_free_argv(allocated_argv, effective_argc);
}
