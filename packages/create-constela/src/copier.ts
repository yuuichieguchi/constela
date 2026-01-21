/**
 * Copier module for create-constela.
 *
 * This module provides functions to copy template files to a destination
 * with variable substitution support.
 */

import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Options for copying a template.
 * projectName is required, additional variables can be provided.
 */
export interface CopyOptions {
  projectName: string;
  [key: string]: string;
}

/**
 * Hidden files to skip during copy.
 * These are typically OS-specific metadata files.
 */
const SKIP_FILES = new Set(['.DS_Store', '.Thumbs.db']);

/**
 * Determines the output filename based on the source filename.
 *
 * - `gitignore` -> `.gitignore`
 * - `*.template` -> removes `.template` extension
 * - Others -> unchanged
 *
 * @param filename - The source filename
 * @returns The output filename
 */
function getOutputFilename(filename: string): string {
  if (filename === 'gitignore') {
    return '.gitignore';
  }

  if (filename === 'npmrc') {
    return '.npmrc';
  }

  if (filename.endsWith('.template')) {
    return filename.slice(0, -'.template'.length);
  }

  return filename;
}

/**
 * Replaces template variables in content with values from options.
 * Variables are in the format {{variableName}}.
 *
 * @param content - The template content
 * @param options - The options containing variable values
 * @returns The content with variables replaced
 */
function substituteVariables(content: string, options: CopyOptions): string {
  let result = content;

  for (const [key, value] of Object.entries(options)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Checks if a file should be skipped during copy.
 *
 * @param filename - The filename to check
 * @returns true if the file should be skipped
 */
function shouldSkipFile(filename: string): boolean {
  return SKIP_FILES.has(filename);
}

/**
 * Copies a single file from source to destination.
 * Handles template files with variable substitution and gitignore renaming.
 *
 * @param srcPath - The source file path
 * @param destPath - The destination directory path
 * @param filename - The source filename
 * @param options - The copy options for variable substitution
 */
async function copyFileWithOptions(
  srcPath: string,
  destPath: string,
  filename: string,
  options: CopyOptions
): Promise<void> {
  const outputFilename = getOutputFilename(filename);
  const destFilePath = join(destPath, outputFilename);
  const srcFilePath = join(srcPath, filename);

  // For template files, gitignore, and npmrc, read content and process
  if (filename.endsWith('.template') || filename === 'gitignore' || filename === 'npmrc') {
    const content = await readFile(srcFilePath, 'utf-8');
    const processedContent = filename.endsWith('.template')
      ? substituteVariables(content, options)
      : content;
    await writeFile(destFilePath, processedContent);
  } else {
    // For regular files, use copyFile to preserve binary data
    await copyFile(srcFilePath, destFilePath);
  }
}

/**
 * Recursively copies a directory from source to destination.
 *
 * @param srcPath - The source directory path
 * @param destPath - The destination directory path
 * @param options - The copy options for variable substitution
 */
async function copyDirectory(
  srcPath: string,
  destPath: string,
  options: CopyOptions
): Promise<void> {
  // Create destination directory
  await mkdir(destPath, { recursive: true });

  // Read directory contents
  const entries = await readdir(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryName = entry.name;

    // Skip hidden files like .DS_Store
    if (shouldSkipFile(entryName)) {
      continue;
    }

    const entrySrcPath = join(srcPath, entryName);

    if (statSync(entrySrcPath).isDirectory()) {
      // Recursively copy subdirectory
      const entryDestPath = join(destPath, entryName);
      await copyDirectory(entrySrcPath, entryDestPath, options);
    } else {
      // Copy file
      await copyFileWithOptions(srcPath, destPath, entryName, options);
    }
  }
}

/**
 * Copies a template directory to a destination with variable substitution.
 *
 * - Files with `.template` extension have variables substituted and extension removed
 * - `gitignore` files are renamed to `.gitignore`
 * - Binary files are copied as-is using fs.copyFile
 * - Directory structure is preserved
 * - Hidden files like `.DS_Store` are skipped
 *
 * @param templatePath - The path to the template directory
 * @param destPath - The destination path for the copied files
 * @param options - The options containing variable values for substitution
 */
export async function copyTemplate(
  templatePath: string,
  destPath: string,
  options: CopyOptions
): Promise<void> {
  await copyDirectory(templatePath, destPath, options);
}
