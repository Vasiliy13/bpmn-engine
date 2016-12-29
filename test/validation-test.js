'use strict';

const Code = require('code');
const Bpmn = require('..');
const factory = require('./helpers/factory');
const Joi = require('joi');
const Lab = require('lab');
const testHelpers = require('./helpers/testHelpers');
const validation = require('../lib/validation');

const lab = exports.lab = Lab.script();
const expect = Code.expect;

const validBpmnDefinition = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <exclusiveGateway id="decision" />
    <endEvent id="end" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="decision" />
    <sequenceFlow id="flow2" sourceRef="decision" targetRef="end" />
  </process>
</definitions>`;

lab.experiment('validation', () => {
  const transformer = Bpmn.Transformer;

  lab.experiment('moddle context', () => {

    lab.test('validates', (done) => {
      transformer.transform(validBpmnDefinition, {}, (err, bpmnObject, context) => {
        if (err) return done(err);
        validation.validate(context, done);
      });
    });

    lab.test('or if definitions are missing', (done) => {
      validation.validate(null, (err) => {
        expect(err).to.be.an.error();
        done();
      });
    });

    lab.test('or if bpmn-moddle returns warnings in context', (done) => {
      const bpmnXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="no-end" />
  </process>
</definitions>`;

      transformer.transform(bpmnXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);

        validation.validate(context, (err) => {
          expect(err).to.be.an.error(/no-end/);
          done();
        });
      });
    });
  });

  lab.experiment('processes', () => {
    lab.test('validates', (done) => {
      transformer.transform(validBpmnDefinition, {}, (err, bpmnObject, context) => {
        if (err) return done(err);
        validation.validate(context, done);
      });
    });

    lab.test('process without flowElements', (done) => {
      const bpmnXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true" />
</definitions>`;

      transformer.transform(bpmnXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);
        validation.validate(context, done);
      });
    });
  });

  lab.experiment('lanes', () => {
    lab.test('validates', (done) => {
      transformer.transform(factory.resource('lanes.bpmn').toString(), {}, (err, bpmnObject, context) => {
        if (err) return done(err);
        validation.validate(context, done);
      });
    });
  });

  lab.experiment('sequenceFlow', () => {
    lab.test('targetRef is required', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <sequenceFlow id="flow1" sourceRef="theStart" />
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);
        validation.validate(context, (err) => {
          expect(err).to.be.an.error(/"targetRef" is required/);
          done();
        });
      });
    });

    lab.test('sourceRef is required', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <endEvent id="end" />
    <sequenceFlow id="flow2" targetRef="end" />
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);
        validation.validate(context, (err) => {
          expect(err).to.be.an.error(/"sourceRef" is required/);
          done();
        });
      });
    });
  });

  lab.experiment('Exclusive gateway', () => {
    lab.test('should not support a single diverging flow with a condition', (done) => {

      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <exclusiveGateway id="decision" />
    <endEvent id="end" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="decision" />
    <sequenceFlow id="flow2" sourceRef="decision" targetRef="end">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[
      this.input <= 50
      ]]></conditionExpression>
    </sequenceFlow>
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);
        validation.validate(context, (err) => {
          expect(err).to.exist();
          done();
        });
      });
    });

    lab.test('should not support multiple diverging flows without conditions', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <exclusiveGateway id="decision" />
    <endEvent id="end1" />
    <endEvent id="end2" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="decision" />
    <sequenceFlow id="flow2" sourceRef="decision" targetRef="end1" />
    <sequenceFlow id="flow3" sourceRef="decision" targetRef="end2" />
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);
        validation.validate(context, (err) => {
          expect(err).to.exist();
          done();
        });
      });
    });

    lab.test('should support exclusiveGateway with default flow', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <exclusiveGateway id="decision" default="flow3" />
    <endEvent id="end1" />
    <endEvent id="end2" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="decision" />
    <sequenceFlow id="flow2" sourceRef="decision" targetRef="end1">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[
      this.input <= 50
      ]]></conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="flow3" sourceRef="decision" targetRef="end2" />
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);

        validation.validate(context, (err) => {
          expect(err).to.not.exist();
          done();
        });
      });
    });

    lab.test('should support two diverging flows with conditions', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <exclusiveGateway id="decision" />
    <endEvent id="end1" />
    <endEvent id="end2" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="decision" />
    <sequenceFlow id="flow2" sourceRef="decision" targetRef="end1">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[
      this.input <= 50
      ]]></conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="flow3" sourceRef="decision" targetRef="end2">
      <conditionExpression xsi:type="tFormalExpression"><![CDATA[
      this.input > 50
      ]]></conditionExpression>
    </sequenceFlow>
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);
        validation.validate(context, (err) => {
          expect(err).to.not.exist();
          done();
        });
      });
    });

    lab.test('no flows are not supported', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <exclusiveGateway id="decision" />
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);

        validation.validate(context, (err) => {
          expect(err).to.exist();
          done();
        });
      });
    });

  });

  lab.describe('serialized bpmn-moddle context', () => {
    lab.test('returns error if warnings', (done) => {
      const bpmnXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <sequenceFlow id="flow1" sourceRef="theStart" targetRef="no-end" />
  </process>
</definitions>`;

      transformer.transform(bpmnXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);

        const contextFromDb = JSON.parse(testHelpers.serializeModdleContext(context));
        contextFromDb.warnings = [{
          message: 'no-end'
        }];

        validation.validate(contextFromDb, (err) => {
          expect(err).to.be.an.error(/no-end/);
          done();
        });
      });
    });

    lab.test('validation is performed', (done) => {
      const processXml = `
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <process id="theProcess" isExecutable="true">
    <startEvent id="theStart" />
    <sequenceFlow id="flow1" sourceRef="theStart" />
  </process>
</definitions>`;

      transformer.transform(processXml, {}, (terr, bpmnObject, context) => {
        if (terr) return done(terr);

        const contextFromDb = JSON.parse(testHelpers.serializeModdleContext(context));

        validation.validate(contextFromDb, (err) => {
          expect(err).to.be.an.error(/"targetRef" is required/);
          done();
        });
      });
    });

  });

  lab.experiment('options', () => {
    lab.test('undefined options is valid', (done) => {
      function fn() {
        validation.validateOptions();
      }
      expect(fn).to.not.throw();
      done();
    });

    lab.test('empty options is valid', (done) => {
      function fn() {
        validation.validateOptions({});
      }
      expect(fn).to.not.throw();
      done();
    });

    lab.describe('listener', () => {
      lab.test('with emit function is valid', (done) => {
        function fn() {
          validation.validateOptions({
            listener: {
              emit: () => {}
            }
          });
        }
        expect(fn).to.throw(Error, /"emit" function is required/);
        done();
      });

      lab.test('without emit function is invalid', (done) => {
        function fn() {
          validation.validateOptions({
            listener: {}
          });
        }
        expect(fn).to.throw(Error, /"emit" function is required/);
        done();
      });
    });

    lab.describe('variables', () => {
      lab.test('as an object is valid', (done) => {
        function fn() {
          validation.validateOptions({
            variables: {}
          });
        }
        expect(fn).to.not.throw();
        done();
      });

      lab.test('as not an object is invalid', (done) => {
        function fn() {
          validation.validateOptions({
            variables: 'gr'
          });
        }
        expect(fn).to.throw(Error, /must be an object/);
        done();
      });
    });

    lab.describe('services', () => {
      lab.test('with service as a function is valid', (done) => {
        function fn() {
          validation.validateOptions({
            services: {
              testFn: function() {}
            }
          });
        }
        expect(fn).to.not.throw();
        done();
      });

      lab.test('service type require', (done) => {
        function fn() {
          validation.validateOptions({
            services: {
              get: {
                module: 'request',
                type: 'require',
                fnName: 'get'
              }
            }
          });
        }
        expect(fn).to.not.throw();
        done();
      });

      lab.test('service type global', (done) => {
        function fn() {
          validation.validateOptions({
            services: {
              getElementById: {
                module: 'document',
                type: 'global'
              }
            }
          });
        }
        expect(fn).to.not.throw();
        done();
      });

      lab.test('without type', (done) => {
        function fn() {
          validation.validateOptions({
            services: {
              get: {
                module: 'request'
              }
            }
          });
        }
        expect(fn).to.not.throw();
        done();
      });

      lab.test('empty service object is valid', (done) => {
        function fn() {
          validation.validateOptions({
            services: {}
          });
        }
        expect(fn).to.not.throw();
        done();
      });

      lab.test('not an object is invalid', (done) => {
        function fn() {
          validation.validateOptions({
            services: function() {}
          });
        }
        expect(fn).to.throw(Error, /must be an object/);
        done();
      });

      lab.test('service as string is invalid', (done) => {
        function fn() {
          validation.validateOptions({
            services: {
              put: 'myService'
            }
          });
        }
        expect(fn).to.throw(Error, /is not a function or an object/);
        done();
      });

      lab.test('type not global or require is invalid', (done) => {
        function fn() {
          validation.validateOptions({
            services: {
              put: {
                module: 'request',
                type: 'POST'
              }
            }
          });
        }
        expect(fn).to.throw(Error, /must be global or require/);
        done();
      });
    });
  });
});
