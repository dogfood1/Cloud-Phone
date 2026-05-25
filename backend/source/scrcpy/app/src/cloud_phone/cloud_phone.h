#ifndef SC_CLOUD_PHONE_H
#define SC_CLOUD_PHONE_H

#include <stdbool.h>

bool
sc_cloud_phone_should_print_capabilities(int argc, char *argv[]);

void
sc_cloud_phone_print_capabilities(void);

bool
sc_cloud_phone_prepare_argv(int argc, char *argv[],
                            int *effective_argc, char ***effective_argv,
                            char ***allocated_argv);

void
sc_cloud_phone_release_argv(char **allocated_argv, int effective_argc);

#endif
