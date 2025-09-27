project('yaml-cpp.wasm', ['cpp'], version: '0.8.0', meson_version: '>=1.3.0', default_options: ['buildtype=release', 'cpp_std=c++17'])

fs = import('fs')

if get_option('simd')
  add_project_arguments('-msimd128', language: 'cpp')
endif

incs = [ include_directories('include'), include_directories('src') ]
core_sources = fs.glob('src/*.cpp')

core = static_library('yamlcpp_core', core_sources, include_directories: incs)

if get_option('main_module')
  executable('yamlcpp-main', 'src/yamlcpp_wasm_module.cpp',
    link_with: core,
    include_directories: incs,
    install: true,
    link_args: [
      '--no-entry',
      '-sMODULARIZE=1',
      '-sEXPORT_ES6=1',
      '-sALLOW_MEMORY_GROWTH=1',
      '-sENVIRONMENT=web,webview,worker',
      '-sNO_FILESYSTEM=1',
      '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString"]',
      '-sEXPORTED_FUNCTIONS=@' + meson.project_source_root() / get_option('exports'),
    ])
endif

if get_option('side_module')
  shared_module('yamlcpp-side', 'src/yamlcpp_wasm_side.cpp',
    link_whole: core,
    include_directories: incs,
    name_prefix: '',
    install: true,
    link_args: ['-sSIDE_MODULE=2', '-fPIC'])
endif

