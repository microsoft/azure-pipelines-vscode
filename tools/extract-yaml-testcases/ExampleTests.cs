using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading;

namespace Example
{
    [TestClass]
    public sealed class PipelineParserBaselineTests
    {
        [TestInitialize]
        public void TestInitialize()
        {
            m_fileProvider = new YamlFileProvider();
            m_fileProviderFactory = new YamlFileProviderFactory(m_fileProvider);
            SetupPipelineParser();
        }

        [TestMethod]
        public void PipelineParserBaselineTests_JobCancelTimeoutInMinutes_FromImpliedJob_LegacyQueue()
        {
            // Arrange
            m_fileProvider.FileContent["ci.yml"] = @"
queue:
  name: myPool
  cancelTimeoutInMinutes: 5
steps:
- script: echo hi
";
            var expected = @"
cancelTimeoutInMinutes: 5
pool: myPool
steps:
- script: echo hi
";

            // Act
            var actual = Load("ci.yml");

            // Assert
            Assert.AreEqual(expected.Trim(), actual.Trim());
        }

        [TestMethod]
        public void PipelineParserBaselineTests_JobCancelTimeoutInMinutes_FromImpliedJob_LegacyServer()
        {
            // Arrange
            m_fileProvider.FileContent["ci.yml"] = @"
server:
  cancelTimeoutInMinutes: 5
steps:
- task: foo@1
";
            var expected = @"
cancelTimeoutInMinutes: 5
pool: server
steps:
- task: foo@1
";

            // Act
            var actual = Load("ci.yml");

            // Assert
            Assert.AreEqual(expected.Trim(), actual.Trim());
        }

        [TestMethod]
        public void PipelineParserBaselineTests_JobCancelTimeoutInMinutes_FromJob()
        {
            // Arrange
            var expected = @"
jobs:
- job: job1
- job: job2
  cancelTimeoutInMinutes: 5
- job: job3
  cancelTimeoutInMinutes: $[ variables.theCancelTimeoutInMinutes ]
";
            m_fileProvider.FileContent["ci.yml"] = expected;

            // Act
            var actual = Load("ci.yml");

            // Assert
            Assert.AreEqual(expected.Trim(), actual.Trim());
        }
    }
}
