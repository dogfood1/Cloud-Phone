#include "config_expand.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../util/log.h"

#define SC_CLOUD_PHONE_MAX_EXTRA_ARGS 256
#define SC_CLOUD_PHONE_CONFIG_FLAG "--cloud-phone-config="

static bool
is_config_arg(const char *arg) {
    const size_t prefix_len = strlen(SC_CLOUD_PHONE_CONFIG_FLAG);
    return !strncmp(arg, SC_CLOUD_PHONE_CONFIG_FLAG, prefix_len);
}

static bool
is_config_flag(const char *arg, char *path_out, size_t path_size) {
    const size_t prefix_len = strlen(SC_CLOUD_PHONE_CONFIG_FLAG);

    if (!strncmp(arg, SC_CLOUD_PHONE_CONFIG_FLAG, prefix_len)) {
        if (path_size > 0) {
            strncpy(path_out, arg + prefix_len, path_size - 1);
            path_out[path_size - 1] = '\0';
        }

        return true;
    }

    return false;
}

static bool
append_arg(char **args, size_t *count, const char *arg) {
    if (*count >= SC_CLOUD_PHONE_MAX_EXTRA_ARGS) {
        LOGE("Cloud Phone config exceeds argument limit");
        return false;
    }

    char *copy = strdup(arg);
    if (!copy) {
        LOG_OOM();
        return false;
    }

    args[*count] = copy;
    (*count)++;
    return true;
}

static bool
append_pair(char **args, size_t *count, const char *key, const char *value) {
    if (!value || !value[0]) {
        return append_arg(args, count, key);
    }

    char pair[512];
    int written = snprintf(pair, sizeof(pair), "%s=%s", key, value);

    if (written < 0 || (size_t) written >= sizeof(pair)) {
        LOGE("Cloud Phone config argument too long: %s", key);
        return false;
    }

    return append_arg(args, count, pair);
}

static bool
parse_config_line(char **args, size_t *count, const char *line) {
    while (*line && isspace((unsigned char) *line)) {
        line++;
    }

    if (!*line || *line == '#') {
        return true;
    }

    char *equals = strchr(line, '=');

    if (equals) {
        *equals = '\0';
        const char *key = line;
        const char *value = equals + 1;

        while (*key && isspace((unsigned char) *key)) {
            key++;
        }

        while (*value && isspace((unsigned char) *value)) {
            value++;
        }

        char flag[256];
        snprintf(flag, sizeof(flag), "--%s", key);
        return append_pair(args, count, flag, value);
    }

    char flag[256];
    snprintf(flag, sizeof(flag), "--%s", line);
    return append_arg(args, count, flag);
}

static bool
load_config_file(const char *path, char **extra_args, size_t *extra_count) {
    FILE *file = fopen(path, "r");

    if (!file) {
        LOGE("Could not open Cloud Phone config: %s", path);
        return false;
    }

    char line[1024];

    while (fgets(line, sizeof(line), file)) {
        char *newline = strchr(line, '\n');

        if (newline) {
            *newline = '\0';
        }

        if (!parse_config_line(extra_args, extra_count, line)) {
            fclose(file);
            return false;
        }
    }

    fclose(file);
    return true;
}

bool
sc_cloud_phone_load_config_args(const char *path,
                                char **extra_args,
                                size_t *extra_count) {
    *extra_count = 0;
    return load_config_file(path, extra_args, extra_count);
}

bool
sc_cloud_phone_build_effective_argv(int argc, char *argv[],
                                    const char *config_path,
                                    int *effective_argc,
                                    char ***effective_argv,
                                    char ***allocated_argv) {
    char *extra_args[SC_CLOUD_PHONE_MAX_EXTRA_ARGS];
    size_t extra_count = 0;

    if (!sc_cloud_phone_load_config_args(config_path, extra_args, &extra_count)) {
        return false;
    }

    int skip_count = 0;
    char config_path_buffer[1024] = {0};

    for (int i = 1; i < argc; ++i) {
        if (is_config_arg(argv[i])) {
            skip_count++;
        }
    }

    int total = argc - skip_count + (int) extra_count;
    char **merged = calloc((size_t) total + 1, sizeof(*merged));

    if (!merged) {
        LOG_OOM();
        return false;
    }

    int index = 0;
    merged[index++] = strdup(argv[0]);

    if (!merged[0]) {
        LOG_OOM();
        free(merged);
        return false;
    }

    for (size_t i = 0; i < extra_count; ++i) {
        merged[index++] = extra_args[i];
        extra_args[i] = NULL;
    }

    for (int i = 1; i < argc; ++i) {
        if (is_config_flag(argv[i], config_path_buffer, sizeof(config_path_buffer))) {
            continue;
        }

        merged[index++] = strdup(argv[i]);

        if (!merged[index - 1]) {
            LOG_OOM();
            sc_cloud_phone_free_argv(merged, index);
            return false;
        }
    }

    merged[index] = NULL;
    *effective_argc = index;
    *effective_argv = merged;
    *allocated_argv = merged;
    return true;
}

void
sc_cloud_phone_free_argv(char **argv, int count) {
    if (!argv) {
        return;
    }

    for (int i = 0; i < count; ++i) {
        free(argv[i]);
    }

    free(argv);
}
