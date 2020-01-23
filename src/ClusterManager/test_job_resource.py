#!/usr/bin/env python3

import os
import sys
sys.path.append(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "../utils"))

from unittest import TestCase
from job_resource import JobResource
from resource_stat import Cpu, Memory


class TestJobResource(TestCase):
    def setUp(self):
        a_res = {
            "cpu": {
                "r1": "10m",
                "r2": "100m"
            },
            "memory": {
                "r1": "100Ki",
                "r2": "200Ki"
            }
        }
        self.a = JobResource(resource=a_res)

        b_res = {
            "cpu": {
                "r1": "100m",
                "r2": "10m"
            },
            "memory": {
                "r1": "300Ki",
                "r2": "100Ki"
            }
        }
        self.b = JobResource(resource=b_res)

        c_res = {
            "cpu": {
                "r1": "10m",
                "": "100m"
            },
            "memory": {
                "r1": "100Ki",
                "": "200Ki"
            }
        }
        self.c = JobResource(resource=c_res)

        self.scalar = 0.8

    def test_init_from_params(self):
        regular_params = {
            "jobtrainingtype": "RegularJob",
            "sku": "r1"
        }
        r_res = JobResource(params=regular_params)
        self.assertEqual(Cpu({"r1": 1}), r_res.cpu)
        self.assertEqual(Memory(), r_res.memory)

        distributed_params = {
            "jobtrainingtype": "PSDistJob",
            "numps": 1,
            "numpsworker": 2,
            "cpurequest": 4,
            "memoryrequest": 102400
        }
        d_res = JobResource(params=distributed_params)
        self.assertEqual(Cpu({"": 9}), d_res.cpu)
        self.assertEqual(Memory({"": 204800}), d_res.memory)

        unrecognized_params = {
            "jobtrainingtype": "Unknown"
        }
        u_res = JobResource(params=unrecognized_params)
        self.assertEqual(Cpu(), u_res.cpu)
        self.assertEqual(Memory(), u_res.memory)

    def test_init_from_resource(self):
        res0 = {}
        ret0 = JobResource(resource=res0)
        self.assertEqual(Cpu(), ret0.cpu)
        self.assertEqual(Memory(), ret0.memory)

        res1 = {
            "cpu": {
                "r1": "1m"
            }
        }
        ret1 = JobResource(resource=res1)
        self.assertEqual(Cpu({"r1": "1m"}), ret1.cpu)
        self.assertEqual(Memory(), ret1.memory)

        res2 = {
            "memory": {
                "r1": "100Mi"
            }
        }
        ret2 = JobResource(resource=res2)
        self.assertEqual(Cpu(), ret2.cpu)
        self.assertEqual(Memory({"r1": "100Mi"}), ret2.memory)

        res3 = {
            "cpu": {
                "r1": "1m"
            },
            "memory": {
                "r1": "100Mi"
            }
        }
        ret3 = JobResource(resource=res3)
        self.assertEqual(Cpu({"r1": "1m"}), ret3.cpu)
        self.assertEqual(Memory({"r1": "100Mi"}), ret3.memory)

    def test_repr(self):
        res = {
            "cpu": {
                "r1": "1m"
            },
            "memory": {
                "r1": "100Ki"
            }
        }
        ret = JobResource(resource=res)
        self.assertEqual("cpu: {'r1': '1m'}. memory: {'r1': '102400B'}.",
                         repr(ret))

    def test_eq(self):
        self.assertTrue(self.a == self.a)
        self.assertFalse(self.a == self.b)
        self.assertFalse(self.a == self.c)
        self.assertFalse(self.b == self.c)

    def test_ge(self):
        self.assertFalse(self.a >= self.b)
        self.assertTrue(self.a >= self.c)
        self.assertFalse(self.c >= self.a)

    def test_add(self):
        result = self.a + self.b
        expected = JobResource(resource={
            "cpu": {
                "r1": "110m",
                "r2": "110m"
            },
            "memory": {
                "r1": "400Ki",
                "r2": "300Ki"
            }
        })
        self.assertEqual(expected, result)

    def test_iadd(self):
        self.a += self.b
        expected = JobResource(resource={
            "cpu": {
                "r1": "110m",
                "r2": "110m"
            },
            "memory": {
                "r1": "400Ki",
                "r2": "300Ki"
            }
        })
        self.assertEqual(expected, self.a)

    def test_sub(self):
        result = self.a - self.b
        expected = JobResource(resource={
            "cpu": {
                "r1": "-90m",
                "r2": "90m"
            },
            "memory": {
                "r1": "-200Ki",
                "r2": "100Ki"
            }
        })
        self.assertEqual(expected, result)

    def test_isub(self):
        self.a -= self.b
        expected = JobResource(resource={
            "cpu": {
                "r1": "-90m",
                "r2": "90m"
            },
            "memory": {
                "r1": "-200Ki",
                "r2": "100Ki"
            }
        })
        self.assertEqual(expected, self.a)

    def test_mul(self):
        result = self.a * self.scalar
        expected = JobResource(resource={
            "cpu": {
                "r1": "8m",
                "r2": "80m"
            },
            "memory": {
                "r1": "80Ki",
                "r2": "160Ki"
            }
        })
        self.assertEqual(expected, result)

    def test_imul(self):
        self.a *= self.scalar
        expected = JobResource(resource={
            "cpu": {
                "r1": "8m",
                "r2": "80m"
            },
            "memory": {
                "r1": "80Ki",
                "r2": "160Ki"
            }
        })
        self.assertEqual(expected, self.a)
