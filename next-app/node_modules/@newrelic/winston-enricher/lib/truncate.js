/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const OUTPUT_LENGTH = 1024
const MAX_LENGTH = 1021

const truncate = (str) => {
  if (typeof str === 'string' && str.length > OUTPUT_LENGTH) {
    return str.substring(0, MAX_LENGTH) + '...'
  }

  return str
}

module.exports = truncate
