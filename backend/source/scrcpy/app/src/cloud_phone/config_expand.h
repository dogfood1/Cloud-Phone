#ifndef SC_CLOUD_PHONE_CONFIG_EXPAND_H
#define SC_CLOUD_PHONE_CONFIG_EXPAND_H

#include <stdbool.h>

bool
sc_cloud_phone_load_config_args(const char *path,
                                char **extra_args,
                                size_t *extra_count);

bool
sc_cloud_phone_build_effective_argv(int argc, char *argv[],
                                    const char *config_path,
                                    int *effective_argc,
                                    char ***effective_argv,
                                    char ***allocated_argv);

void
sc_cloud_phone_free_argv(char **argv, int count);

#endif
