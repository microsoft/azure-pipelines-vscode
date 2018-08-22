# Extract YAML Testcases

The Azure Pipelines source code (accessible only to Microsoft employees) has a
large set of unit tests for the YAML parser. This tool will extract those test
cases into discrete files for use in unit testing the language server.

This tool is open source, but the input data is not. From time to time, an
Azure Pipelines employee should re-run the tool to extract the latest unit
tests. TODO: follow up with Microsoft CELA to ensure we can ship the extracted
test cases.
