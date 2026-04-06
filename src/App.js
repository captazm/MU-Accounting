import React, { useState, useMemo, useEffect } from "react";
import Tesseract from "tesseract.js";
import { C, Badge, Btn, Stat, Filt, Mod, thS, tdS } from "./components/UI";
import { fsListenCol, fsSetDoc, fsUpdateDoc, fsBatchSet, fsDelDoc, fsGetDoc, fsUploadFile } from "./services/firebase";
import { onAuthChange, authSignOut, fetchUserProfile, hasAnyUser } from "./services/auth";
import LoginPage from "./components/LoginPage";
import UserManagement from "./components/UserManagement";

const logoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQABLAEsAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAAEsAAAAAQAAASwAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAaGgAwAEAAAAAQAAAb4AAAAA/+0AOFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAAOEJJTQQlAAAAAAAQ1B2M2Y8AsgTpgAmY7PhCfv/AABEIAb4BoQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/3QAEABv/2gAMAwEAAhEDEQA/AP1SooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9D9UqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//R/VKiiigAoooyKACik3D16UuRQAUUUZFABRRketGRQAUUZzRQAUUUUAFFFFABRRmjNABRRmgMD0IPegAooyKM0AFFGaKACiiigAooooAKKKKACiiigAooyKMj1oAKKMj1oyKACijNGRQAUUUUAFFFGaACik3D1FLuHqKACijI9aMigAooyKMigAoozmigAooooAKKKPAP/9L9UqKKKAA0w4Az0HrTz0rF8Y+LNN8DeF9T17VZhb6fp8DXEznGcKM4A7SeAB3JA701duyKjFyaiupj/E74qeGfhH4ck1rxNqMdjajiOPrLcP2SNerN9OnU4AJr4U+KP/BRLxf4gupLfwVYW/hjTwfkublFubp/chv3aD2wx/2q8I+N3xp1v44+NrnXdVlaO1BKWFgHzHyQ54Udi3Qs3c+wAHn1e7QwcUuae5+j5dkVGjBVMQuaXboj068/ab+K19cNNL4+1sO3UQ3JiXPsqYArpfB/7afxa8I3KMfEv9t2ynm11aFZlb6vgSD8Hrwyiu10YNWaR78sDhpLldJW9D9O/wBn/wDbe8M/Fq8tdD1u3HhjxNNhIo3k3W103QCNzjDE9EYewLE19LhgfSvwuU4IIODX6S/sNftHT/EzQJPCHiK6M/iTSYQ8F1KxL3ltwMsf4nQkKSeSCp5O415GJwqprmp7Hw+b5KsNH2+H+Hqux9XAdeKWkBB5pa8s+PA9KaeOe1OPArP1zXNP8O6Vc6jql7BYWNshkmuLiQJHGo7kngUJXY0m3Zbl7Oe9YHjDx/4b8Aad9t8R65YaNbHIV72dY95HZQeWPsMmviP48f8ABQa8u5bjSPhpH9mtRlX167izJJ/1xib7oxj5nBPP3QQK+OfEHiPVfFeqS6lrOo3Wq6hNy91eSmWRvqTyPp0+lelSwUp6z0PqsFw/WrpTrvlX4n6QeLf+Chnwx0IvHpaat4jkxw9pa+VFn3aUq35Ka811D/gpuQ7rY/D4leNsk+rYP4qIf618L0V6CwVJH1FPIMDDdN/M+4bP/gpvciTF38Po3jJ5MWrkEDvwYTn8xXeeF/8Ago94D1ORIta0bWdGdsbpURLmJfXJBDY+i59hX5xUfzolg6TQ55DgZ/Za9Gfsz8P/AI3+Bfigi/8ACM+J9P1KYru+yiTy7gL6mJ8OB74rusg8g5r8L4LiW1mSaCRopo2DJIhIKkHIOcgg5r6U+C/7dfjX4dSxWXiSR/GGgjAYXj/6ZEvqkx+99HznA+ZRk1xVMDJawZ89i+HKlNc2HlzeXU/T0HpS1xPwr+L/AIX+MWgJq/hnUkvIuk0DfJPbuR92RDyp/Q9iRXbZB715jTi7M+PnCVOTjNWYUUUVJAUUUZxQAHgUnbrioL+8gsrOa4uJ47eCJC8ksrBVRRySSegHevif9oD/AIKBQ6bJc6H8NY47ydcpLr9yoeFD0/cRn7/+83y8fdYHNa06U6rtFHdhcHWxk+WlG/mfYfizxvoPgbTG1DxBrFlo1mpx517Msak+gyeT7Dmvnbxn/wAFDfht4ed4dHh1TxNMvR7aDyYc57tIVP5Ka/OrxZ4y1zx1rEmq+IdWu9Y1GT7093KXIHXavYD2AAHowVi169PAQS99n22G4cox1rycn2R9s6p/wU01SWQ/2f4FtYIwet1qLSsR9BGuPzNZsP/BS3xYHbzvCOkOmfl2TSqQPfJPNfHFFdP1SjbY9dZLgUrezPvXw7/wUz0+WZV13wPdWkQHMunXyzsf+AOqY+m417r8PP2wfhb8RXigtvEcWk3zkAWesD7K+T0AZvkYn0VjX5K0tZTwVOS00OKtw9hKi9y8WfugsiOm9WUqRnIPFO79c1+RHwd/ai8d/BeeGPTdTfUNET7+j6i5kg299nOYz3ypxnqpr9FPgH+034T+O1jssJTpmvwpuudHuWAkT1ZDx5iZzyMH1AyK8urhZ0td0fHY/KK+B974o9z2UUUgP60uRXGeEB6U1uVNONc/478Z6b8P/AAfqviHVpfJ0/T7dp5SPvNgcKvqzHCgdyQKaTbsioxc2oxWrMT4rfGLwx8GPDrax4mvxbRnKwW0Q3T3L4zsjTuenPAGeSBzXwf8AFD/goR458UXUsHhKGDwlpn3UlCJcXTD1ZnUqv0C5HPzGvDvjH8X9c+Nfja78Q61M21iUtLMNmO1hz8safh1P8R5NcNXvUMJCKTmtT9Jy7IqFCCqYhc030PQb79oP4nahcmeX4g+JVc9oNUmiX/vlGVa6rwf+2P8AFrwdPGyeKptXgUgtbawi3Sv7Fmw4H0YGvFKK7HShLRpHvSwWGmrOmmvQ/TX9nz9uHw58Vry20PxFbp4Y8Sy4jhzLm1u2PQRseVYnojeoAJJxX06GB9K/C4HDDBxz19K/SX9hj9oy6+J/h+bwl4iujc+I9HhDw3UrEyXdtwMse7oSFJPUMp5Oa8jE4VU1zQ2Phs3yZYaPt8P8PVdj6uA68UtIMGlryz48KKKKACiiigD/0/1SooooAG6V8e/8FH/HE2j/AA30DwxA7RnXLxpbjBwHhgCkqf8AgckTf8Ar7CPSvgb/AIKbq39sfD+TB8s296AxHGd0Ofx6fnXXhEpVopntZNCNTHU1L1+5HxJ15PU8n60lLSV9J5H649wooopiF6V6D+z945l+HPxl8J67HIYoor6OG5wcZgkPlyA+vyMT9QK89qW2hknuYoogTLI4RADtyScAZ7VE0pRaZjWhGpSnCWzVj9zUO4A9qUE59qZERsX6U44Kn0r5M/EX5GX4q8U6X4L8O32t61eR2GmWUZlnuJTwqj9SScAAckkAZJr8rv2k/wBp7W/j1rskEbS6d4St5M2el5/1n/TSbBwznqOcKCQM8k9z+3H+0LJ8RPGEng3RrnPhvRZyty8bHbeXQ4Y8dUTJUDudx54x8s5zivbwmGUVzy3P0XJMqjRisRWV5PbyF7+p6/59/pSUUteofX7CUUf/AKqDxQD03Cil9fbrR2z2pCumJSjg5zjFFJTK9DqPhz8SPEPwp8T22veGr97C+h4IHMcyd45E6Op9M+4wQDX6ofs8ftDaH8fPCwvbNls9atVVdR0tny8Dn+Jc43I2OG/A4INfkPXR/D/4ga58MPFVn4h8PXrWWo2jcFSSkin7yOP4kYAZHqMjBxXFiMPGqtNzwM0yqGOp3irTWzP2xHWlryP9nj9oXQvj34WF7ZsljrVoFXUNKZ8vAxHDKf4kbBw34HBBFeubh6189KLg7M/LatKdCbp1FZoCcVS1bVbPRdNur+/uYrSyto2lmuJ3CJGijJZmPAAHOadq2q2ei6ZdX9/cxWdlbRtLNcTOESNFGSzMegA71+ZH7WX7WN38aNRk8PeHpZbTwVbydwUfUWU8SSA4IjB5VDj+83OFXajRlWlZHoZfl9TH1OWOkerH/tX/ALXF98YtQm8O+G5prHwTC+09Uk1JgeHk6EICMqhx2ZucBfmnvzj/AD/KjuT+v+fxNFfRU6Uaa5Yn6thcLSwlNU6asgopaStjqCijpS0rolyit2JRQOf50tMsPr09qu6NreoeHNWtdU0u7lsNRtJPNhubdyjxuO4bt+oqjQaTSejJcVJWktD9Rf2Sv2qbf43aWdG1ww2njKyj3SpGNkd5EMDzUHYjoy9uo4OF+j8j8a/ELwp4p1TwV4k07XdHu2s9UsJhPBOn8LA8gjupHBByCCR3r9ePgN8XLD42fDrTfEtntinkHlXtqGz9nuFA3p9OQQe6spwCa8DFYf2T5lsfmOdZZ9Tl7akvcf4Hop5xXxp/wUl8bTaX4G8L+F4JCi6teSXNzg/ejgC4Vsdi0qn/AIBX2SemP0r8/f8Agpjbyp4v8EzN/qXsbhFOf4lkQtx9GWs8Ik60bnJk0Izx0FL1/A+L85xRS0lfSH63sFFFFAha9F/Z48cTfDz41eEdaik8qJb+OC564MEpEcgI7/KxIHqq15zV7Q4pZ9b0+KDPnvcRqmF3HcWGOPrUTSlGSfYwrwjUoyhLZo/cRDnB9afUUOAFHsKlr5N7n4kwooopCCiiigD/1P1SooooARulfK3/AAUL+Hc3ir4RWniC0j8y58O3Xmy4GSLeXCSYHs3lMfQKT2r6qIyKqappttrGnXVhewpdWd1E0M0Mo3LIjDDKR3BBIxWtOfs5KR1YWu8NWjWXRn4a0V7b+07+zXqvwH8VSyQxSXnhK8kY6fqGN3lgnPkyns4zwejAZH8QHiXUZr6iE1UXMj9joV6eIpqpTd0wopaKs6BOxr1n9ln4ey/En45+F9PWMtZ2lyNSuyBlRDAwfDezMFTP+2PWvM9H0e+1/VLXTtMtJ76/uZBHBb2yF5JHPQKB3r9Sf2Rf2ck+BWjPjU1STxXqypJfspBECgEpAp6ELk5I6sT2ArjxNZUoNdWeFm+OhhMPJX96Wi/zPewuxAB2rx/9q/4rv8ACH4M6vqdpL5Or3uNO09gcFZpAfnHuqB3Huor2I9M1+eH/BSPxzJqXj7w54Vjf/R9Ms2vJQDwZZWxgj1Cxgj/AHzXiYeHtKiR+fZVh/rWLhCS03fofHjMXYszFi3O5skn8/60lFFfT7aI/XrW2Cruj6NfeINUtdN020lv9QupBFBbQIWeRz0AFUidvOcY5zX6T/sQ/s4W3w98H23jTWrNW8TaxCJYFlUZsbZuVVfR3BDMevIXjDZ569ZUYXZ5eY4+GAo88tW9kcZ8E/8gnfZRW1vqfxIvHublgGGi2Eu2OP2klHLH2TaAQfmbNfU/hn4J+AvCFskGkeDtFslUbd62UbSEZ43OQWP4mu1PAyeK8o+IH7T/wAPPhtey2Opa0LnUoiVktNPjM7oR1VivyqfYkGvm6uJe85WPzd1sfmdTlheT7K52etfDTwl4ijZNV8MaPqKNwRdWEUn/oSmvAviv+wB4E8ZW8tz4XL+D9WOXHkZltpG9GjY5X0yjKB3DV1vhv8AbT+GHiE3S2fUrnRndtqtqVsY0PuXUsqj3Yivb7W7g1G0jubWZLiCVQ8csLBldTyCD0I75qKWJbd6cgn/AGhlkk5qUH5n41fFj4PeJ/gx4lfRfEtibeQ5a3u4jvt7pB/FG/ccjg4YZ5AzXE9s9q/Z74q/CjQPjF4QuvD3iC1E1tL80UyYEttIBhZI2xwwyfYgkEEE1+U/xx+B3iD4E+L5NH1iMzWc257HUo0xFdx5HzD0YZG5Ccg46ggn6HDYpVfde59zlWbwx37uppP8zzmijtntRXd5H0l+50fw++IGu/DDxXZ+IfD169lqVo3BUkpIp+8jj+JWwMj1GRg4r9S/gb+0v4X+MXgW41t7q30a90yHzNWsriYKLUAEmTccZjIBIf6g4IIr8kfryKliuJoElSOV0WVfLkVWwHXIJDAHBGVU4PUrmuSvho1t9Dw8xyulj0m9JLr+h9HftZ/tZXfxo1GTw94ekls/BNvJ3BR9RZTxJIDyIweVQ4/vNzhV+bO5P6/5/E0dyf1/z+JoranTjTSSPRw2FpYSmqdJWSClop0MT3MqRRxmWR2CrGo3FiTjGO+ela3Otu24QxPcypFGjSyOwVUVdxY5xgDuc8V9rfAT/gn1LrFnba18SZ5rKKTEkeg2j7ZSP+m8n8P+4vIB5IORXefsg/sgL4BhtPGfjO2EviZgJLLTphuXTwejsP8Anrj/AL49yePrtVwcAcev9K8bEYtt8tM/P80zyTk6OEdl1f8Akcb4P+DngfwDbxxeH/C2l6aUGBNHbKZj7tIQWb6kk11N7pVpqEDQ3VpBdRN1jmjDKfwINcJ8Svj/AOB/hRJ9n17WY0v8AiwtlMs+DyCUUHaD6tgGvONN/bw+Gt/d+TPFrOnRZx9oubRSn1+R2bH4V4ksTCLtKWvqeHTy/MsVD20KcpLvqbnxL/Y3+GPxIgmf+w4/D+osMpfaKBbsrepQDy29yVz7jrX5+/H39mfxR8A9RQ36LqXh+4cpa6vbIRGx7I68mNyATtzg84Jwcfq14X8WaP4z0mHVNE1G31Owkztmtn3jI6g+hHcHkUeLvCWleOPDt/oet2cd/pt9EYZ7eTowPcHqCCMgjBBAIIIr0KGKlB3vdG+CnXE4GpyVbtdU+h+IwOen1or0H47/AAkvfgn8StT8MXTvcW8ZWeyumGDPbtkox4HP3lIHAZWxxXn1fRRkprmR+n0qsa0FUhsxa+pP2APiy/gz4qSeFbqfbpXiRPLRXPEd0gJjb/gQDJgdSUr5aq/oGs3XhzXdO1aybZeWNzHdQt6OjBl/UCoqwVSDiYYzDxxWHnSl1X4n7hHDDFfK3/BQz4cTeK/hNY+IrSLzLrw7deZJgZP2eXCSY+jCIn0AJr6W8La9b+KfDmlazZsWtNQtYruEnqUdAy/oRVvVdLtdZ0y70++gS6s7qJoZoJACsiMMMpHcEEj8a+ZhJ0583Y/IsNWlg8RGot4s/DfkUle3/tOfs06t8CPFMs1vDNeeEL2X/QNQwW8vPPkyns47E/eAyP4gPEO9fUQmqi5kfsNCvTxEFUpu6YUUtJ2z2qzoD/PFey/si/Dmb4kfHfw1bCMtY6bONVvHA+VVhYOAf95/LX/gVeeLeHvDup+K9bs9H0ixl1DU7uQRQW0K7mdj7enc54AznAr9Uf2Vf2dIPgJ4LZbxkuvE2pbZdRuU5CYHywof7q5PPcknptA4sVWVODj1Z8/nGOhhcPKCfvS0R7ggxgU6kHWlr5w/KgooooAKKKKAP/9X9UqKKKAA8Uh6ZHWlpMYoAzfEHh7TvE+k3Ol6tYwajp9yuya2uYw8ci+4Pv/LNfH3xQ/4Jw6Rq1zNe+BtdfRGY7hpupBpoB7LIDvVfZt596+0yM0YrWnVnT+FnbhsbiMHLmoysfmDff8E9/ivaXBjjTRbxB/y1hviEP4Min9K6jwh/wt/TSCPiPxDpWjWpILLaB7qYdyMEKvc/xHua/RQjml9810vG1bHry4gx0lZNL5HkvwU/Zm8GfAy2L6LZPd6vIm2bV77D3DDuqkDCL7KBnAzkjNetKO560A9yelUNW8S6ToEQl1PU7PToz0e7nWIfmxFcjcpu71PCqVKmInzTbbNBjhTX5H/tg60dd/aP8azbtyw3MdooDZCiKJIyB+Kk/Umv02uPjv8NYWaOT4g+Fo5F4KtrNuCPw31+Unx+1Oz1n42eN7/T7qC+sbjVriSG5tpBJHKhckMrDIIPqK9LAwam20fV8OUpRxMpSi1p+qOApaSlr2z9Esd18CfBCfEf4v+E/D0q+Za3l+huF/vQJmSUfiiMK/ZSGMRIqqoUKoAAGOK/Kn9hySCP9pvwn5q5YrdiJvRjay/0yPxr9WCcjArw8e/fSPzfiWcniIQeyX+Z80/to/HC++HPhyz8O6F3ttrGro7S3UbYkt7ccEqezMTgMOm1u+K/Pskkkk5PTPt/ntX0j+3ukw+NNi0gby20eHyiTkY82XOPxz/kivm2vgcbVlOq12P1PhbCUcPl1OpD4p6t/oA6j07/TvXvP7NP7Td98H9Sj0jWJJb3wfcN88OS7WTE8vFn+Huyd+o5yD4NR057jkH0rjp1Z0mpQPfxmBoY+i6FaN0/607M/Y3SNYs9f0u21HTrmO9srmMSwzwsGV1PIIPvXN/FX4U6D8YvCN14e8Q23nWs3zRTJxLbSYIWSNuzDP0IyCME18G/s0ftLXnwc1RdJ1VpLvwhcyEyw/eazY9ZIx6d2Xv1HOc/otpGr2ev6Va6jp9zHe2V1GJYZ4WDI6nkEGvrMNiVWXNHRo/As1yrEZJiVvy/Zl/XU/IL44/A7X/gT4wk0fV086zl3PY6lGmIruPI+YejDI3ITkEjqCCfOe2e1fs/8VfhToPxj8I3fh7xBbCa2m+eKZOJbeTBCyRtjhhn6EEggjNflN8cfgd4g+BXjCTR9XjM1nNuew1KNCIruPI+YejDI3ITkZHUEE/V4bEqr7stz67KM2jjYqlV0mvx8zzmijtnt60V3n0gUtJT4oXuJUijjMsjkKsarksTwAB3z0oC6S1CGJ7mVIo4zLI7BVjUbixJxjHfPSv0T/ZC/Y/TwBb2njTxpbLN4mdRJZadMNy6eD0dh/A17p4A/CC/wDghhtPGfjO2EviZgJLLTphuXTwejsP/euP++PqePrrGDjHHTNeJisU5e5DY/Pc4zh1v8AZ8O/d6vv/wAAANvH6189/tPftO2nwmsJNA0KSO78WzpgrwyWKEcO46FiPuqfqeMbj9p79p61+EljLoGgyR3Xi2eP2ZbBCOHccguRyqkH1PGA355ajqN1q99cXt76/uS3d5cOZZp5nLO7EnJYnqT1r5TGYv2a9nTep6XDXDbxjji8XG1Pov5v8AgfmGo6jd6vfT3t9cS3d5cOZZp5n3vIxOWYk98/Wq4OCDyMHqO1FFfNuV3dn7RGKjFKKslsem/AD4zah8G/G9reJMx0O6kSHUrPJKPHnG8D+8gJII57cAmv1KgmWeFJUIZHUMrKcgg/41+NHce/Ffrz8OYJ7b4f8AhyG6BFxHptssm7rvES5/WvoMtqSlzRlsfkXG2EpUp0q8VaUrp+drHyl/wUq8FQ3XhDwt4rjjAurO9bT5WUctHIjOufYNHx/vmvz9r9Ov+ChFxFD+z7IkhAeXU7ZIwR1b5m/kpr8xa+7wTbpahw/OUsEk+jaClxnikoPQ/4a7z6XpY/XP8AZE1o6/8As5eBrln3tHZG1yf+mMjxf+069hbhTivkf9kv4/fD3wL+z74U0bXvFum6bqsH2tpbSaTLoGu5mXdgcZBB57EHoa960n4+fDfWpRHZeO/D00h4EY1KEOfopbNfL1YS9pLTqfjuMw9VYio1F2u+nmdZrmgWHiTSrnTdWsYNR0+5QxzWtzGJI5F9Cp4PNfIvxO/4JyaDrVzLe+Ctal8PMxLDTr5WubcH0R870H139/avseC8gvIVkgmjmjcZV42BDD2IqTr7VMKs6T0MsPjMRg5XpSsfmhc/8E6fijBOyJe+HZ0HIkS8mwfwMXFdL4O/4JreJ7q5D+KPFGm6ba5G6PS43uJWHcZYIFPv830r9CWB7U4Hiuh4ys1uepLP8bJWUkvkeYfBv9nbwX8DrMp4e07dqEi7Z9UvCJLmUDtuwAq/7KgL7Z5r04DBHHTvilxznNLXHKTk7s8KpVnWlz1HdhRRRUmQUUUUAFFFFAH/1v1SooooAKKKOkoAD0puB+VOpM4oAzfEHh7TvE+k3Ol6tYwajp9yuya2uYw8ci+4Pv/LNfH3xQ/4Jw6Rq1zNe+BtdfRGY7hpupBpoB7LIDvVfZt596+0yM0YrWnVnT+FnbhsbiMHLmoysfmDff8E9/ivaXBjjTRbxB/y1hviEP4Min9K6jwh/wt/TSCPiPxDpWjWpILLaB7qYdyMEKvc/xHua/RQjml9810vG1bHry4gx0lZNL5HkvwU/Zm8GfAy2L6LZPd6vIm2bV77D3DDuqkDCL7KBnAzkjNetKO560A9yelUNW8S6ToEQl1PU7PToz0e7nWIfmxFcjcpu71PCqVKmInzTbbNBjhTX5H/tg60dd/aP8azbtyw3MdooDZCiKJIyB+Kk/Umv02uPjv8NYWaOT4g+Fo5F4KtrNuCPw31+Unx+1Oz1n42eN7/T7qC+sbjVriSG5tpBJHKhckMrDIIPqK9LAwam20fV8OUpRxMpSi1p+qOApaSlr2z9Esd18CfBCfEf4v+E/D0q+Za3l+huF/vQJmSUfiiMK/ZSGMRIqqoUKoAAGOK/Kn9hySCP9pvwn5q5YrdiJvRjay/0yPxr9WCcjArw8e/fSPzfiWcniIQeyX+Z80/to/HC++HPhyz8O6F3ttrGro7S3UbYkt7ccEqezMTgMOm1u+K/Pskkkk5PTPt/ntX0j+3ukw+NNi0gby20eHyiTkY82XOPxz/kivm2vgcbVlOq12P1PhbCUcPl1OpD4p6t/oA6j07/TvXvP7NP7Td98H9Sj0jWJJb3wfcN88OS7WTE8vFn+Huyd+o5yD4NR057jkH0rjp1Z0mpQPfxmBoY+i6FaN0/607M/Y3SNYs9f0u21HTrmO9srmMSwzwsGV1PIIPvXN/FX4U6D8YvCN14e8Q23nWs3zRTJxLbSYIWSNuzDP0IyCME18G/s0ftLXnwc1RdJ1VpLvwhcyEyw/eazY9ZIx6d2Xv1HOc/otpGr2ev6Va6jp9zHe2V1GJYZ4WDI6nkEGvrMNiVWXNHRo/As1yrEZJiVvy/Zl/XU/IL44/A7X/gT4wk0fV086zl3PY6lGmIruPI+YejDI3ITkEjqCCfOe2e1fs/8VfhToPxj8I3fh7xBbCa2m+eKZOJbeTBCyRtjhhn6EEggjNflN8cfgd4g+BXjCTR9XjM1nNuew1KNCIruPI+YejDI3ITkZHUEE/V4bEqr7stz67KM2jjYqlV0mvx8zzmijtnt60V3n0gUtJT4oXuJUijjMsjkKsarksTwAB3z0oC6S1CGJ7mVIo4zLI7BWjUbixJxjHfPSv0T/ZC/Y/TwBb2njTxpbLN4mdRJZadMNy6eD0dh/A17p4A/CC/wDghhtPGfjO2EviZgJLLTphuXTwejsP/euP++PqePrrGDjHHTNeJisU5e5DY/Pc4zh1v8AZ8O/d6vv/wAAANvH6189/tPftO2nwmsJNA0KSO78WzpgrwyWKEcO46FiPuqfqeMbj9p79p61+EljLoGgyR3Xi2eP2ZbBCOHccguRyqkH1PGA355ajqN1q99cXt76/uS3d5cOZZp5nLO7EnJYnqT1r5TGYv2a9nTep6XDXDbxjji8XG1Pov5v8AgfmGo6jd6vfT3t9cS3d5cOZZp5n3vIxOWYk98/Wq4OCDyMHqO1FFfNuV3dn7RGKjFKKslsem/AD4zah8G/G9reJMx0O6kSHUrPJKPHnG8D+8gJII57cAmv1KgmWeFJUIZHUMrKcgg/41+NHce/Ffrz8OYJ7b4f8AhyG6BFxHptssm7rvES5/WvoMtqSlzRlsfkXG2EpUp0q8VaUrp+drHyl/wUq8FQ3XhDwt4rjjAurO9bT5WUctHIjOufYNHx/vmvz9r9Ov+ChFxFD+z7IkhAeXU7ZIwR1b5m/kpr8xa+7wTbpahw/OUsEk+jaClxnikoPQ/4a7z6XpY/XP8AZE1o6/8As5eBrln3tHZG1yf+mMjxf+069hbhTivkf9kv4/fD3wL+z74U0bXvFum6bqsH2tpbSaTLoGu5mXdgcZBB57EHoa960n4+fDfWpRHZeO/D00h4EY1KEOfopbNfL1YS9pLTqfjuMw9VYio1F2u+nmdZrmgWHiTSrnTdWsYNR0+5QxzWtzGJI5F9Cp4PNfIvxO/4JyaDrVzLe+Ctal8PMxLDTr5WubcH0R870H139/avseC8gvIVkgmjmjcZV42BDD2IqTr7VMKs6T0MsPjMRg5XpSsfmhc/8E6fijBOyJe+HZ0HIkS8mwfwMXFdL4O/4JreJ7q5D+KPFGm6ba5G6PS43uJWHcZYIFPv830r9CWB7U4Hiuh4ys1uepLP8bJWUkvkeYfBv9nbwX8DrMp4e07dqEi7Z9UvCJLmUDtuwAq/7KgL7Z5r04DBHHTvilxznNLXHKTk7s8KpVnWlz1HdhRRRUmQUUUUAFFFFAH/1v1SooooAKKK+6SA9KacA54FOPpS7h60AVbi4it4XlmkWOKMFndztVFHUknp9a+XfjP/AG8/B/gSSe28Kxf8JhrEZKNLFJsso2HrLz5hHHCDB5+YGvlf9pL9rvX/AI13txpWlSz0PwcjkJZK22W6APyvMf4iAcD7oJBANfPnAAA6DgYr16ODXxVD7rL+H1ZVMX9x7T8Qf2w/in8QXEsq+IpNEsmPFnoo+yqPYyAmQjtgtivHLy8n1C4ea6nkuJnOXllcu7HHUknmoKK9SNKEdon2VLC0aCtTikvQOuffmiis/WNYs9A0u61HUbqKwsbaNpZri4cJHGijJZmPAAHNU3Y3m0ldmnmiuT+H/xP8OfFLTW1Pw1qC6pYRSmFrpIXWPf6BiBuPuMjjrXWULpYmElUjzwd0FFHeigp6HTfCPxvJ8OPib4m8SAsI6dfRTbaMkRYxIB7khwP+B1+zVnfW+pWcN1bSRz28yJJHLG2VdSMghh1BBBH1r8NR0r9B/2Ef2lbfWNKtfhv4juBHqdkpXR7mV8C4gA/wBRz/Gv8PqvA+6c+XjqTklNdD47iDBSrU1Xpq7jv6Hqf7XHwIn+L3hO01DREEniLSGeSGInBuYmGXhB9SQpGccjGRur85bm3ls7iW3nhf7RCxR4pFKsrA4III5BzkYPT8K/Zd2B7/Svmn9qb9leL4i28/ifwtbLD4niUtcWyYVdQUDpzwJccBjwejdMfF43CepUp79S+GeIHgmsFil7nR/yv9D8/qKlubeazuJbeeOSGeJijxSRlWVgcEGuT9/z6/5/+vXzr1Z+zKzXkdN8P/iBrnwY8W2PiHw9evZajZ8Nkt5ckeRujcejY6fjzg5/Ur4HfGbw78bvDMuqaK7RXsOBe6bMwM1rIRn/AICSMEOOMDGMivx779ce/pXvH7NH7S158HdUTSdVZ7vwfcyEyxZ+azcmMkj92Xv1HOc/o6rSpS5o7dT47iDJo5lSc4K1SP4n7I6Rq9nr+lW2o6bcx3tlcoJYZoHDrIpPBGPr+lc38Vfinofwi8I3fiHxBb+dbx/LFCvEtxIQNskbY4YbfoRkEEZpvwu+FWhfB7wndeHvD1v9mtJvmlmbiW4kIGZGbqWOPoOABNflR8cfghr/AMCvGMmh6unmWcuXstTRCIruPI+YejDI3ITkEjqCCfqsNidXGe5+D5xlE8ZFVauk/wAzP8cfG7X/AId+MZtc1ZPPs5Nz2Opo5MV3CT9w9GHRlPBB6ggmvOx2zX6P/shfsgN4AtbTxn4ytxL4lkXfZaXMMpp4PR2H/PXH/fH1PB8ffmOOnXmvExWKclyw2/E/Pc4zn23+z4Z+7H8f8AANXwf4P1jx74jsdA0Kyk1HVL1/LigjHX1YnoFAySx4ABNfqp+zP+zHo/wB8ObP3eo+Kb+Mf2hqjD8fKiyB8oJ+rEZPZRP+zZ+zVpH7PvhwBhHqHim8Qfb9R29PXyoz1VAfxY9T0A9rIGT346mvGr15VXZ7HzGKy95VSeIraTewA5o/CisLxl4y0fwH4bvde12+j0/TLNN8s8vbsFAGSSSSABkkkCudJvRHixjKclGKuzN+KXxb8L/Bow6j4ov/ALNbNhoY4R5lxO2QREidT068AdSRXwh8Uf8AgoX4y8VXU1v4Rgh8J6WCdkwT7RdN6MS4Kr7ALx0ya8S+NXxe1v41+NrrxFrcm3cUjtLMNmO0iz8kafrk/wAR5NcHXvUMJGKvNan6Rl2S0KEL4mPNJ9D0PVf2hvifrdw8998QPEkjsckLqc0aj/gKsqjrXS+D/wBrT4teDZ0YeKrnV4AQWt9WRLlW9izAvj6MK8WorsdODVmj3ZYPDTjyypp+p+mv7Pn7cXhz4rXltofia3j8MeJJDsi3S7rW7fssbHDKT0CtnPYkmvp0MD0OfX6V+F6nDDBxnjpX6L/ALDX7SN18UPDs/hTxHdG68RaRCrx3Up+e6t+AGY93XIDHqdynkk48jE4VU1zQ2Phc3yZYaPt8P8PVdj6uXg9fagdeK+Gf+CkXjmXTPBPhbwtBIyDVrqS6udvBKQKAqsewbzd2PVEr7mJzk141KSlUaXSx8NiKE8LSjOp9q9vQCfyr69/wCCeXwjPiPxvfePr+DNhoYNvZPjh7tlyzDj+CM9ezOvcfKP+f8APf61+rv7NfwwX4SfCDw9ok0SpqcsAvdRYY5uJfmcHH907E+iA1hi6ns6dluz5fiDE8uHVGO7/JHqA6UtfGP/AAUk8ZzaL8N/D/huB9jatetNPg8+TCAyqf8AgalD/wAAzX2eelea6clTUn1PkMRCthKcZ1FZSN7xpLPH/uY6/wB8fWvgv/gpzZST+Ivh/cgqYhb38beqlmgIz+Ir7T8Z6kdL8K6xehthtbSeYNuI2FEY9uvSvy2/bP8AjGfi/wDFXzbOfztC0SMWFkwziRukkv0ZhgH+6inrXRhIv2yl2PVyWnP66qkdrP8AEvlP/9f9UqKKKACmP0pw6U1uaYHyZ+17+yEPitBeeMfCUCW/jGFN9zZoAF1FVHvwsowAGPXo3Yj86rq2msrqW2uYZLe4hcxyxSrtZGBwQQeQcgjB6H1r9y3OMZGPxr5O/a//AGQYPihBc+L/AAfbR23i6JDJdWiYUagAO/YSgDAJ+8ODXpYXFOVozPsMmzr2X+z4h6dG/wAz86aSl7en60V9Afol0woA3cA9ccH2o98gfWvcP2XP2ar343arPqGpSTaf4R05gtzdx4Ek79TDGfxUsecAjAy2RFSrCmuZ7I58TiaOEpurVdoon/ZP+AHiT4l/EPQdeNnc6d4Y02+iuptScGNZDEwaOOInG5mOASCdoJJr9WlwOnAHSszw54d0/wAKaLZ6NpNnDYaZZxiKC2gXCIo/XPfJySSSSSSTqAcA185XrOq7/cfkuaZjLM63O1aK2X6ijrS0g60tee888DOfN/Z/fNfOf7U/7K8PxEtrnxd4WtY4fEcS7ri0jAVNQUDuOgmA4BPDY9cH6NIyKaxxkA/XmtKVKVWXKjswuLrYKsqtN2Z+Klxby2dxLbzRvBPEzRvFIpV0YHDAg8g5yMHvUR4yRzX6T/st/sqRfEW3uPFPiS38rw7KhS3tkARtRYA8nkERBuh7n3HHwHe28tncS280b288LFJIpEKuhBwVIPTBqK1OVGai9z9PwGPo5nT9pSfqv5SGu++FfxH1j4UeM9O8R6LKy3Nm2HiB+SeEn54mGR8pAHuDzXBA4INfSn7KP7K1x8S72DX9fgkt/ClvJnI+U3zDPyIcghDzk+gPpg51asKUHOfQ2xlfD4Wk6uK+Ffh89D9Pvhv8RdG+Kng7T/EmhzebZ3ke6SJsb4X/ijkAzhgeeODkEZXmupJwKztA0PTvDmkWumaXZW2nafapiC0tYgkcanngDpyT+dc18Vfir4e+EHhWfxB4guhbW6YWGBeZbiTkhEAPLegPAGSMAE188/ecvZo/LpxjVquNBPlvojV8YeMdI8C6Dd61ruoW+l6XbLmSeaQbST0CjuxPQDJJ6Cvy0/as/ansvjrrMel6JpC2Xh/T5C8V5fJuvHY8MY/m2xKe4BbdxyuSDe/ab/aitvji9rYaHpL6foenyl4rvUURruRsc4GGETE8H5m3DH3enztX0OEwqpLnm9T9KyXI6eDSr19Zvl9Fp+YUUUteofV2Cuk+HvgHWfih4p0/wxhqOo3TfLnoijlnYjkKoBJ79h8xArn+vOAK+vf+CefxcHg34l3nhW/uPK03xFFtgLdFu48snXs6bwf9oRjnscKr9nBtI4MdiZYSg60Vdr8utvzPvf4U/CzQvg58P4PD/h+3WKFfnmuf+WtxNjBlkYdSR2+6qgAV2R7fSnDqfpTq+XlJyd2fj86kq03N7sB2r46/wCCkXjeTTPAvhjwvBIEOrXklzdLuHMcAXap74Mkitn/AGK+xT0r89P+CmNvMni7wTMxzbtY3CLz8u4SLux77cfktb4SKeIjf1PWyaEZ42CfS/4HxZ15PU8n60lLSV9L5H649wooopiF6V6D+z945l+HPxk8J66kiRRQX8cNycZzA58qTHp8jkj6CvPaVYZLjzIosmaVWRMHA3EEA5+oP6GonFSi0zGtTjVpSg9mj9yUKuobrxT81DD9wcdu9SBgWOCDXyT1PxK6V4vofIn/AAUi8Fzaz8LPDeu28ZkGk6lsuGHVIpVI3H28xIx/wOvVf2VPibH8VPgf4X1QzGfUrK3Gm6huOf38ICO3uWBRzz1evVfEnhjS/GPh++0XWLOPUdNvImhmtp+Q6nt6jjI7YOO9fI37Hvwg8Y/AT40eNfDd5Y3dz4O1C387TNVHMPyuGTeRna5RyrE9Sre+MqqVWhZbxPFrUamFx6rrWE7I4T/gploF7F4t8Ga44VtOuLGeyRhwRIsm9vXjbKgHP8B9K+IK/Wv9tf4RzfF34I38NhbSXut6LKNUsoIxlpWQFZY055ZoS+APvFVFfkr3I6EdR9Ov5V9Fgp3pcsnsz7Th+uquD9m/ii2vwT/U/9D9UqKKKACiiigAooooAD05rwP9pn9lzT/AI2WI1LS5YdK8W2qfuryVf3N0oIxHMeoA/hYbtpP3SpO33ykPNXGcqcuaG5vRrVcPO8HZn5Rax+yn8UtFvDbSeEry9IcDzdNZZoxnvyRx+Fe5fC39hLxdrF/DN4xeLwrpanfLCkkU9xKP7qBf3a5PVi/ToDxX3SeoBpeMmuueOrSjyo97EcRY/E0/Y0pJeZgeDPBWjeANEg0bw/pkOl6Xbk7LeDPfqxOSST1JJJPqa3hwM98U6krgfNsj5qc5VJOc93uA60tAopGAHpSUppM9vWm9gCiiigYV8vftL/ALKFj8RrSfxN4XtktPFsSbpraMBIdQUclWPAEnAAY8Ho3XcPqGkK5A9M04ycJcyNsPiq2DqqtRdmvzPxFubeWzuJbaeN6Z4mKPFKpV1YHBBB5BzkYPT8K/R39jL4lX/j34SfZdYt0t7zw/cDTPNXO6WNY0ZM+pUOEz/s88nmD/aq/ZWh+IVrc+KvCtqkHiiFd1xaRjamoKB+AlA4Vjw2MHGQ3wFc28tncS280bwzxMUeKRSrKwOCCDyDnIwen4VrWpRw7VR7M/ScJjMPxFhHSqv31uv5fW3mftmPlA+tfOn7cXwy1n4h/B8XmiQve3OhXX9oPaJnLReU6SOoAJYoCvC4O0sc4GK+Vf2Yf2q9X+Feo22ieIriXU/CEr7fnBaTTwST5kWcllBxlPTpyMn9IdL1Wy1vTrW/sLmK8srqNJoLqBwySowDK6sOCCMGubWLU+58NisPiMjxSq7pbeZh6loV/4l8BzaRc3z2N9fab9nmvbZQzJI8W1nXPuw688YPPX8yPjr8Bdf8AgV4wk0fV086zl3PY6lGmIruPI+YejDI3ITkEjqCCf1i9scfyrk/if8LtB+LnhS60DxBaLeWs3Mc6fLNbSY4kjbqrD8Qecgg8/WYbEqm/e3O/Js4lllVqt70Gz8ZKK9D+OPwS1/4FeMZND1hBNZzbnsNSjTELuPP3D1YdGU8g+owT55057ete9GSmuaOx+mUKscRTVSm7p7B/XNdB8O/iBrHwt8Yad4m0Obyb+zlyFOfLlQ53xvjkKwyP5EHBrn6MZ4HWm0pRaZpUpwpRcZq6Z+xD4N8S6N4X8P32u6zM8OnWMD3NxP8AdUIoyST7enXpxXzd8Z/2/wDBnhB3sfBscXjHUwAZLvfssh6qr9XYHsowOfm4NfK/7Sn7Xer/ABsuZtJ0tJNF8Ho/FmrbZrtBnDTkfw9hGMgEnknivAs8Anv3/DmvGoYFX56mx+f5fw99YviMV8Pp08/60PZPiF+198UviG8izeIZdDsnPFpov+jKB7sG8xj0+8xFePXV1Pe3ElzczSXFxM2Xlmcs7EnJJJySSTmoKK9eNONNcsT7SlhaGFhy04peguDjjn6Uf56ZpOnbn0616b8BfgPre+PnizStL05GtdLt9r6hqbLujto8n8N7YIUdfmzyAajU1BXkTVr08PHmqPRD/gF8B9e+Pfi1NL05WtdLtyH1DVGTMdtGf5u2DtTPOOcAEj9Vvhh8MtB+Efha08O+HbMW9vAMu7fNLPIQAZJG/ibge3AAAAAFfDL4ZaB8JPClp4d8N2YtbCH5pHOXlnkI5kkb+JjgDPQADGFwB068ZPrXzOJxXtnZbH5Xmmazx87R0gvx8wAGaWiiuI+fCiiigAooooA//R/VKiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9L9UqKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//Z";

const getLH = () => `
  <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #86198f; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; gap: 15px;">
      <img src="${window.location.origin}/logo.jpg" style="height: 60px; width: auto;" alt="Logo" onerror="this.src='/logo.jpg'" />
      <div>
        <div style="color: #86198f; font-size: 17px; font-weight: 800; line-height: 1.1; margin-bottom: 4px; letter-spacing: -0.01em;">MAHAR UNITY COMPANY LIMITED (Marine Services)</div>
        <div style="font-size: 10px; color: #4b5563; line-height: 1.5;">
          No.87, SAN PYA(4), YAMONE NAR (2) Ward, DAWBON Tsp, Yangon, Myanmar.<br/>
          Ph: +95-9793832006, +95-9269016699 | Email: crewing@maharunity.com | Web: www.maharunity.com
        </div>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
      <div style="display: flex; align-items: center; gap: 8px; border: 1.5px solid #1e3a8a; border-radius: 4px; overflow: hidden; height: 36px; background: white;">
        <div style="background: #1e3a8a; color: white; padding: 0 8px; height: 100%; display: flex; align-items: center; font-size: 10px; font-weight: 800;">ANAB</div>
        <div style="padding: 0 10px; color: #1e3a8a; font-size: 9px; font-weight: 800; text-align: center; line-height: 1.1;">ISO 9001:2015<br/><span style="font-size: 7px; font-weight: 400;">Certified</span></div>
      </div>
    </div>
  </div>`;

const downloadCSV = (rows, filename) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  // Ensure .csv extension
  const safeName = (filename.endsWith(".csv") ? filename : filename + ".csv").replace(/[/\\?%*:|"<>]/g, '-');
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [crew, setCrew] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [slips, setSlips] = useState([]);
  const [crewPay, setCrewPay] = useState([]);
  const [sb, setSb] = useState(true);
  const [modal, setModal] = useState(null);
  const [fN, setFN] = useState("");
  const [fV, setFV] = useState("");
  const [fC, setFC] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fsOk, setFsOk] = useState(false);
  const [migrating, setMigrating] = useState(false);
  // ── Auth State ──
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);      // "admin" | "accountant"
  const [userProfile, setUserProfile] = useState(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  // selectedMonth = the salary month (e.g. "2026-03" means March salaries paid ~end of April)
  const now = new Date();
  const defaultSalaryMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`; // previous month
  const [selectedMonth, setSelectedMonth] = useState(defaultSalaryMonth);

  const vessels = useMemo(() => [...new Set(crew.map(c => c.vessel).filter(Boolean))].sort(), [crew]);
  const clients = useMemo(() => [...new Set(crew.map(c => c.client).filter(c => c && c !== "."))].sort(), [crew]);
  const showT = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // ── Auth listener: run once, checks login state ────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        setCurrentUser(firebaseUser);
        setUserProfile(profile);
        setUserRole(profile?.role || "accountant");
        setIsFirstTime(false);
      } else {
        // No user logged in — check if first-time setup needed
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole(null);
        const anyUser = await hasAnyUser();
        setIsFirstTime(!anyUser);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Data Real-time Listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setCrew([]); setBills([]); setPayments([]); setSlips([]); setCrewPay([]);
      setFsOk(false);
      return;
    }
    
    setLoading(true);
    const unsubs = [
      fsListenCol("crew", (data) => { setCrew(data); setFsOk(true); setLoading(false); }),
      fsListenCol("bills", (data) => setBills(data)),
      fsListenCol("payments", (data) => setPayments(data)),
      fsListenCol("slips", (data) => setSlips(data)),
      fsListenCol("crewPayments", (data) => setCrewPay(data))
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [currentUser]);

  const bulkUpload = async (file) => {
    if (!file) return;
    setMigrating(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
        const headers = rows[0].map(h => h.toLowerCase());
        const dataRows = rows.slice(1).filter(r => r.length > 1 && r[0]);
        
        const items = dataRows.map((r, i) => {
          const obj = {};
          headers.forEach((h, idx) => {
            const val = r[idx];
            if (h === "no") obj.no = Number(val) || i + 1;
            else if (h === "name") obj.nm = val;
            else if (h === "rank") obj.rk = val;
            else if (h === "ownerpaid" || h === "wages") obj.op = Number(val) || 0;
            else if (h === "vessel") obj.vs = val;
            else if (h === "client") obj.cl = val;
            else if (h === "joindate") obj.jd = val;
            else if (h === "salary") obj.sl = Number(val) || 0;
            else if (h === "office") obj.of = Number(val) || 0;
            else if (h === "remark") obj.rm = val;
            else if (h === "manningfees") obj.mf = Number(val) || 0;
          });
          
          return {
            id: `C${String(obj.no || i + 1).padStart(3, "0")}`,
            no: obj.no || i + 1,
            name: obj.nm || "Unknown",
            rank: obj.rk || "—",
            ownerPaid: obj.op || 0,
            vessel: obj.vs || "—",
            client: obj.cl || "—",
            joinDate: obj.jd || "",
            salary: obj.sl || 0,
            office: obj.of || 0,
            remark: obj.rm || "",
            manningFees: obj.mf || 0,
            status: "Onboard",
            allotment: { type: "bank", bankName: "", account: "", split: 100 },
            createdAt: new Date().toISOString()
          };
        });

        const ok = await fsBatchSet("crew", items);
        if (ok) showT(`${items.length} crew members uploaded successfully!`);
        else showT("Bulk upload failed", "err");
      } catch (err) {
        console.error("CSV parse error:", err);
        showT("Failed to parse CSV file", "err");
      }
      setMigrating(false);
    };
    reader.readAsText(file);
  };


  const filtered = useMemo(() => crew.filter(c => {
    if (fN && !c.name.toLowerCase().includes(fN.toLowerCase()) && !(c.id || "").toLowerCase().includes(fN.toLowerCase())) return false;
    if (fV && c.vessel !== fV) return false;
    if (fC && c.client !== fC) return false;
    return true;
  }), [crew, fN, fV, fC]);

  const allNav = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "crew",      label: "Crew Registry", icon: "👥" },
    { id: "billing",   label: "Monthly Billing", icon: "📄" },
    { id: "reconcile", label: "Reconciliation", icon: "🔍" },
    { id: "slip",      label: "Salary Assignment", icon: "📋" },
    { id: "dist",      label: "Payment Dist.", icon: "💸" },
    { id: "board",     label: "Status Board", icon: "📌" },
    { id: "users",     label: "User Management", icon: "🔐", adminOnly: true },
  ];
  const nav = allNav.filter(n => !n.adminOnly || userRole === "admin");
  const fs = { setD: fsSetDoc, upD: fsUpdateDoc, batchW: fsBatchSet, delD: fsDelDoc, getD: fsGetDoc };
  const p = { crew, setCrew, bills, setBills, payments, setPayments, slips, setSlips, crewPay, setCrewPay, filtered, fN, setFN, fV, setFV, fC, setFC, modal, setModal, setTab, showT, vessels, clients, fs, fsOk, selectedMonth, setSelectedMonth, userRole, bulkUpload, migrating };

  const Spinner = ({ msg }) => (<div style={{ height: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.txt, fontFamily: "sans-serif" }}><div style={{ width: 50, height: 50, borderRadius: 12, background: `linear-gradient(135deg,${C.pri},${C.inf})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#fff", fontSize: 22, fontWeight: 700 }}>M</div><div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>MAHAR UNITY SRPS</div><div style={{ color: C.txM, fontSize: 12 }}>{msg || "Loading..."}</div></div>);

  if (authLoading) return <Spinner msg="Checking authentication..." />;
  if (!currentUser) return <LoginPage isFirstTime={isFirstTime} />;
  if (loading) return <Spinner msg="Loading from Firestore..." />;

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.txt, fontFamily: "system-ui,sans-serif", fontSize: "12.5px", overflow: "hidden" }}>
      {toast && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: toast.type === "ok" ? C.ok : toast.type === "wrn" ? C.wrn : C.err, color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{toast.msg}</div>}
      <div style={{ width: sb ? 200 : 50, transition: "width 0.2s", background: C.sf, borderRight: `1px solid ${C.bdr}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: sb ? "12px 10px" : "12px 6px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.bdr}`, cursor: "pointer", minHeight: 48 }} onClick={() => setSb(!sb)}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${C.pri},${C.inf})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 14, fontWeight: 700 }}>M</div>
          {sb && <div><div style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px" }}>MAHAR UNITY</div><div style={{ fontSize: 9, color: C.txD, letterSpacing: "1px" }}>SRPS ACCOUNTING</div></div>}
        </div>
        <nav style={{ flex: 1, padding: "6px 4px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {nav.map(n => <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: sb ? "8px 9px" : "8px 10px", borderRadius: 6, border: "none", cursor: "pointer", transition: "all 0.15s", background: tab === n.id ? C.priG : "transparent", color: tab === n.id ? C.acc : C.txM, fontSize: 12, fontWeight: tab === n.id ? 600 : 400, textAlign: "left", borderLeft: tab === n.id ? `2px solid ${C.pri}` : "2px solid transparent", justifyContent: sb ? "flex-start" : "center" }}>{sb ? n.label : n.icon}</button>)}
        </nav>
        {sb && <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.bdr}`, fontSize: 9.5 }}>
          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "5px 6px", background: C.card, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: userRole === "admin" ? `linear-gradient(135deg,${C.inf},${C.pri})` : `linear-gradient(135deg,${C.ok},${C.pri})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{(userProfile?.displayName || "U")[0].toUpperCase()}</div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userProfile?.displayName || "User"}</div>
              <div style={{ fontSize: 9, color: userRole === "admin" ? C.inf : C.ok, textTransform: "capitalize" }}>{userRole}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: fsOk ? C.ok : C.wrn }}>● {fsOk ? "Firestore Sync Active" : "Connecting..." }</div>
          <div style={{ color: C.txD, marginTop: 2 }}>{crew.length} crew members</div>
          <button onClick={async () => { await authSignOut(); }} style={{ marginTop: 6, width: "100%", background: `${C.err}18`, color: C.err, border: `1px solid ${C.err}30`, borderRadius: 4, padding: "4px 8px", fontSize: 9.5, cursor: "pointer", fontWeight: 600 }}>Sign Out</button>
        </div>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.sf, minHeight: 42 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{nav.find(n => n.id === tab)?.label}</h2>
          <span style={{ fontSize: 10, color: C.txD }}>April 2026</span>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {tab === "dashboard" && <Dash {...p} />}
          {tab === "board" && <BoardV {...p} />}
          {tab === "crew" && <CrewV {...p} />}
          {tab === "billing" && <BillV {...p} />}
          {tab === "reconcile" && <ReconV {...p} />}
          {tab === "slip" && <SlipV {...p} />}
          {tab === "dist" && <DistV {...p} />}
          {tab === "users" && userRole === "admin" && <UserManagement currentUser={currentUser} showT={showT} />}
        </div>
      </div>
    </div>
  );
}

// ============== DASHBOARD ==============
function Dash({ crew, bills, payments, crewPay, slips, setTab, selectedMonth, setSelectedMonth }) {
  // selectedMonth = salary month (e.g. "2026-03" = March salaries)
  // Payment for that month typically arrives ~end of next month
  const mBills = bills.filter(b => b.month === selectedMonth);
  const mBillIds = new Set(mBills.map(b => b.id));
  const mPayments = payments.filter(p => mBillIds.has(p.billId));
  const mSlipIds = new Set(
    payments.filter(p => mBillIds.has(p.billId)).map(p => p.id)
  );
  const mSlips = slips.filter(s => mSlipIds.has(s.payId));
  const mSlipCrewIds = new Set(mSlips.flatMap(s => s.crewIds || []));
  const mPaidCrewIds = new Set(
    crewPay.filter(p => {
      // Find the slip this payment came from and check if it's from this month's bills
      const slip = slips.find(s => s.id === p.slipId);
      return slip && mSlipIds.has(slip.payId);
    }).map(p => p.crewId)
  );

  const tb = mBills.reduce((s, b) => s + (b.total || 0), 0);
  const tr = mPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const paidCount = mPaidCrewIds.size;
  const slipCount = mSlipCrewIds.size;
  const pendingCount = crew.length - paidCount;

  // Month display helpers
  const [sy, sm] = selectedMonth.split("-").map(Number);
  const salaryMonthLabel = new Date(sy, sm - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const payMonthDate = new Date(sy, sm, 1); // next month
  const payMonthLabel = payMonthDate.toLocaleString("en", { month: "long", year: "numeric" });

  // Prev/next month helpers
  const changeMonth = (delta) => {
    const d = new Date(sy, sm - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const bc = {}; crew.forEach(c => { if (!bc[c.client]) bc[c.client] = { n: 0, t: 0 }; bc[c.client].n++; bc[c.client].t += (c.ownerPaid || 0); });
  const tc = Object.entries(bc).sort((a, b) => b[1].t - a[1].t).slice(0, 8);
  const mx = Math.max(...tc.map(([, d]) => d.t), 1);
  const vCount = [...new Set(crew.map(c => c.vessel).filter(Boolean))].length;

  const pct = crew.length > 0 ? Math.round((paidCount / crew.length) * 100) : 0;

  return <div>
    {/* Month selector banner */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div>
        <div style={{ fontSize: 10, color: C.txD, marginBottom: 2 }}>VIEWING SALARY MONTH</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>‹</button>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }}
              style={{ background: "transparent", border: "none", color: C.acc, fontSize: 15, fontWeight: 700, cursor: "pointer", outline: "none", paddingRight: 18 }} />
            <span style={{ position: "absolute", right: 2, pointerEvents: "none", color: C.acc, fontSize: 10 }}>▼</span>
          </div>
          <button onClick={() => changeMonth(1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>›</button>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: C.txM, background: C.bg, borderRadius: 6, padding: "6px 10px", border: `1px solid ${C.bdr}` }}>
        <span style={{ color: C.txD }}>Salary: </span><b style={{ color: C.acc }}>{salaryMonthLabel}</b>
        <span style={{ color: C.txD, margin: "0 6px" }}>→</span>
        <span style={{ color: C.txD }}>Payment expected: </span><b style={{ color: C.ok }}>{payMonthLabel}</b>
      </div>
    </div>

    {/* Stats */}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <Stat label="Total Crew" val={crew.length} sub={`${vCount} vessels`} color={C.pri} onClick={() => setTab("crew")} icon="👥" />
      <Stat label="Bills This Month" val={mBills.length} sub={mBills.length ? `$${tb.toLocaleString()} USD` : "No bills"} color={C.inf} onClick={() => setTab("billing")} icon="📄" />
      <Stat label="Received" val={mPayments.length ? `$${tr.toLocaleString()}` : "—"} sub={tr >= tb && tb > 0 ? "Fully paid" : tb > 0 ? `$${(tb - tr).toLocaleString()} short` : ""} color={C.ok} icon="💰" />
      <Stat label="Salary Paid" val={`${paidCount}/${crew.length}`} sub={`${pct}%`} color={pct === 100 ? C.ok : pct > 50 ? C.wrn : C.err} onClick={() => setTab("board")} icon="✅" />
    </div>

    {/* Progress bar */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.txM }}>Salary Payment Progress — {salaryMonthLabel}</h4>
        <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? C.ok : C.wrn }}>{pct}%</span>
      </div>
      <div style={{ height: 10, background: C.bg, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${C.pri},${C.ok})`, borderRadius: 5, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 10.5 }}>
        {[["Paid", paidCount, C.ok], ["Slip Received", slipCount - paidCount, C.inf], ["Pending", pendingCount - (slipCount - paidCount), C.wrn]].map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ color: C.txM }}>{l}:</span>
            <span style={{ fontWeight: 700, color: c }}>{Math.max(0, v)}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Top clients */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: C.txM }}>Top Clients by Owner Paid</h4>
      {tc.map(([cl, d]) => <div key={cl} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11.5 }}>{cl}</span><span style={{ fontSize: 11.5, fontWeight: 600, color: C.acc }}>${d.t.toLocaleString()}</span></div>
        <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${(d.t / mx) * 100}%`, background: `linear-gradient(90deg,${C.pri},${C.acc})`, borderRadius: 3 }} /></div>
        <div style={{ fontSize: 9, color: C.txD, marginTop: 1 }}>{d.n} crew</div>
      </div>)}
    </div>
  </div>;
}

// ============== CREW REGISTRY ==============
function CrewV({ crew, setCrew, filtered, fN, setFN, fV, setFV, fC, setFC, modal, setModal, showT, vessels, clients, fs, bulkUpload, migrating }) {
  const [form, setForm] = useState({});
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  const save = async () => { if (!form.name) return; const f = { ...form, ownerPaid: Number(form.ownerPaid) || 0, salary: Number(form.salary) || 0, office: Number(form.office) || 0, manningFees: Number(form.manningFees) || 0 }; await fs.setD("crew", f.id, f); setModal(null); showT(`${f.name} saved to Firestore`); };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 11.5, color: C.txM }}>{filtered.length}/{crew.length} crew members</span>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="file" id="csv-upload" accept=".csv" style={{ display: "none" }} onChange={(e) => bulkUpload(e.target.files[0])} />
        <Btn v="sec" onClick={() => document.getElementById("csv-upload").click()} disabled={migrating}>{migrating ? "Uploading..." : "Bulk CSV Import"}</Btn>
        <Btn onClick={() => { setForm({ id: `C${String(crew.length + 1).padStart(3, "0")}`, no: crew.length + 1, name: "", rank: "", ownerPaid: 0, vessel: "", client: "", joinDate: "", salary: 0, office: 0, remark: "", manningFees: 0, status: "Onboard", allotmentType: "bank", bankName: "", bankAccNo: "", bankAccName: "" }); setModal("add"); }}>+ Add New</Btn>
      </div>
    </div>
    <Filt {...{ fN, setFN, fV, setFV, fC, setFC, vessels, clients }} />
    <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["No", "ID", "Name", "Rank", "Vessel", "Client", "Join", "OwnerPaid", "Salary", "Office", "Manning", "Remark", "Bank", "Acc No", "Acc Name", "PayType", ""].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{filtered.map(c => <tr key={c.id || c.no}><td style={tdS}>{c.no}</td><td style={tdS}><span style={{ color: C.acc, fontWeight: 600 }}>{c.id}</span></td><td style={tdS}><span style={{ fontWeight: 500 }}>{c.name}</span></td><td style={tdS}>{c.rank}</td><td style={{ ...tdS, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{c.vessel || "—"}</td><td style={tdS}>{c.client}</td><td style={tdS}>{c.joinDate || "—"}</td><td style={{ ...tdS, fontWeight: 600, color: C.acc }}>${(c.ownerPaid || 0).toLocaleString()}</td><td style={tdS}>${(c.salary || 0).toLocaleString()}</td><td style={tdS}>${(c.office || 0).toLocaleString()}</td><td style={tdS}>${c.manningFees || 0}</td><td style={{ ...tdS, fontSize: 10, color: C.txD, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{c.remark || "—"}</td><td style={tdS}>{c.bankName || "—"}</td><td style={tdS}>{c.bankAccNo || "—"}</td><td style={tdS}>{c.bankAccName || "—"}</td><td style={{ ...tdS, textTransform: "capitalize" }}>{c.allotmentType || "bank"}</td><td style={tdS}><Btn v="ghost" onClick={() => { setForm({ ...c }); setModal("edit"); }}>Edit</Btn></td></tr>)}</tbody></table></div>
    {(modal === "add" || modal === "edit") && <Mod title={modal === "add" ? "Add Crew" : "Edit Crew"} onClose={() => setModal(null)}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{[["ID", "id", true], ["Name *", "name"], ["Rank", "rank"], ["Vessel", "vessel"], ["Client", "client"], ["Join Date", "joinDate"], ["Owner Paid", "ownerPaid"], ["Salary", "salary"], ["Office", "office"], ["Manning", "manningFees"], ["Remark", "remark"], ["Bank Name", "bankName"], ["Bank Acc No", "bankAccNo"], ["Bank Acc Name", "bankAccName"]].map(([l, k, d]) => <div key={k}><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>{l}</label>{k === "bankName" ? <select value={form[k] ?? ""} onChange={e => setForm({ ...form, [k]: e.target.value })} style={inp}><option value="">Select Bank</option>{["KBZ", "AYA", "A Bank", "CB", "MAB", "Yoma", "Kpay", "Aya Pay"].map(b => <option key={b} value={b}>{b}</option>)}</select> : <input value={form[k] ?? ""} disabled={d} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ ...inp, opacity: d ? 0.5 : 1 }} />}</div>)}<div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Payment Type</label><select value={form.allotmentType || "bank"} onChange={e => setForm({ ...form, allotmentType: e.target.value })} style={inp}><option value="bank">Bank</option><option value="cash">Cash (Office)</option></select></div></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 14 }}><Btn v="sec" onClick={() => setModal(null)}>Cancel</Btn><Btn v="ok" onClick={save}>Save</Btn></div></Mod>}
  </div>;
}

// ============== BILLING ==============
function BillV({ crew, bills, setBills, showT, clients, fs, fsOk }) {
  const [sc, setSc] = useState(""); const [mo, setMo] = useState("2026-04"); const [vb, setVb] = useState(null);
  const [confDel, setConfDel] = useState(null);
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none" };
  const getDIM = (y, m) => new Date(y, m, 0).getDate();
  const fmtD = (d, m, y) => { const ms = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]; return `${d}.${ms[m - 1]}.${y}`; };
  const gen = async () => { if (!sc) return; 
    let cl = crew.filter(c => c.client === sc); 
    if (sc === "Mr.Xing & Mr.Zhong") { cl = crew.filter(c => c.client === "XING" || c.client === "MR.ZHONG"); }
    else if (sc === "CHH (All)") { cl = crew.filter(c => c.client && c.client.startsWith("CHH")); }
    const vName = bc.length > 0 ? (bc.every(c => c.vessel === bc[0].vessel) ? bc[0].vessel : "Multiple Vessels") : "No Vessel";
    const bill = { id: `BILL-${String(bills.length + 1).padStart(3, "0")}`, client: sc, vessel: vName, month: mo, from: fmtD(1, m, y), to: fmtD(dim, m, y), crew: bc, totalHA: Math.round(bc.reduce((s, c) => s + c.actualHA, 0) * 100) / 100, total: Math.round(bc.reduce((s, c) => s + c.totalPayment, 0) * 100) / 100, status: "Draft", date: new Date().toISOString().split("T")[0], bankInfo: { accNo: "840-096-0029-001674-501", accName: "Mahar Unity (Thailand) Company Limited", bankName: "Bangkok Bank", swift: "BKKBTHBK", remark: "Manning fee calculated upon 30 days, no overlap" } };
    setBills([...bills, bill]); if (fsOk) fs.setD("bills", bill.id, bill); showT(`Bill ${bill.id} created for ${sc}`); };
  const setSt = async (id, st) => { setBills(bills.map(b => b.id === id ? { ...b, status: st } : b)); if (fsOk) fs.upD("bills", id, { status: st }); showT(`${id} → ${st}`); };
  const fi = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 3, color: C.txt, padding: "3px 5px", fontSize: 10.5, outline: "none", width: 55, textAlign: "right" };
  const upB = (bid, field, val) => { setBills(bills.map(b => b.id === bid ? { ...b, bankInfo: { ...b.bankInfo, [field]: val } } : b)); };
  const remC = (bid, cid, name) => { setConfDel({ bid, cid, name }); };
  const execRemC = async () => {
    if (!confDel) return;
    const { bid, cid } = confDel;
    const ident = String(cid);
    setBills(prev => {
      const nb = prev.map(b => {
        if (b.id !== bid) return b;
        const nc = b.crew.filter(c => String(c.id || c.name) !== ident);
        const tHA = Math.round(nc.reduce((s, c) => s + (c.actualHA || 0), 0) * 100) / 100;
        const tot = Math.round(nc.reduce((s, c) => s + (c.totalPayment || 0), 0) * 100) / 100;
        const updated = { ...b, crew: nc, totalHA: tHA, total: tot };
        if (fsOk) fs.upD("bills", bid, { crew: nc, totalHA: tHA, total: tot });
        return updated;
      });
      return nb;
    });
    setConfDel(null);
    showT("Crew removed from bill");
  };
  const upL = (bid, cid, field, val) => {
    const ident = String(cid);
    setBills(prev => prev.map(b => {
      if (b.id !== bid) return b;
      const uc = (b.crew || []).map(c => {
        if (String(c.id || c.name) !== ident) return c;
        const isNum = field !== "billRemark";
        const u = { ...c, [field]: isNum ? (Number(val) || 0) : val };
        if (field === "daysOnBoard") {
          u.actualHA = u.daysOnBoard === u.daysOfMonth ? (u.ownerPaid || 0) : Math.round(((u.ownerPaid || 0) / u.daysOfMonth) * u.daysOnBoard * 100) / 100;
        }
        u.totalPayment = (u.actualHA || 0) + (u.pob || 0) + (u.bonus || 0) + (u.pdeFees || 0) + (u.visaFees || 0) + (u.workingGear || 0);
        return u;
      });
      const newTHA = Math.round(uc.reduce((s, c) => s + (c.actualHA || 0), 0) * 100) / 100;
      const newTot = Math.round(uc.reduce((s, c) => s + (c.totalPayment || 0), 0) * 100) / 100;
      const updated = { ...b, crew: uc, totalHA: newTHA, total: newTot };
      if (fsOk) fs.upD("bills", bid, { crew: uc, totalHA: newTHA, total: newTot });
      return updated;
    }));
  };
  const exportCSV = (b) => {
    const hdr = ['Name','Sign On','Wages/M','From','To','Days Board','Days/M','Actual HA','POB','Bonus','PDE','VISA','WG','Total','Remark'];
    const rows = (b.crew||[]).map(c => [c.name,c.joinDate||'',c.ownerPaid||0,c.from,c.to,c.daysOnBoard,c.daysOfMonth,(c.actualHA||0).toFixed(2),c.pob||0,c.bonus||0,c.pdeFees||0,c.visaFees||0,c.workingGear||0,(c.totalPayment||0).toFixed(2),c.billRemark||'']);
    const csv = [hdr,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${b.id}-${b.client}-${b.month}.csv`.replace(/[/\\?%*:|"<>]/g, '-');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
  };
  const exportPDF = (b) => { const trs=(b.crew||[]).map((c,i)=>`<tr><td>${i+1}</td><td>${c.name}</td><td>${c.joinDate||''}</td><td>${c.ownerPaid||0}</td><td>${c.from}</td><td>${c.to}</td><td style="color:${c.daysOnBoard<c.daysOfMonth?'#F59E0B':'inherit'}">${c.daysOnBoard}</td><td>${c.daysOfMonth}</td><td>${(c.actualHA||0).toFixed(2)}</td><td>${c.pob||0}</td><td>${c.bonus||0}</td><td>${c.pdeFees||0}</td><td>${c.visaFees||0}</td><td>${c.workingGear||0}</td><td><b>${(c.totalPayment||0).toFixed(2)}</b></td><td>${c.billRemark||''}</td></tr>`).join(''); const html=`<!DOCTYPE html><html><head><title>${b.id}</title><style>*{font-family:'Inter',sans-serif;font-size:10px}body{margin:30px}h2{font-size:14px;margin-bottom:12px;color:#2563eb;border-bottom:1px solid #eee;padding-bottom:5px}.info{color:#666;margin-bottom:15px;display:flex;justify-content:space-between}table{border-collapse:collapse;width:100%;margin-bottom:20px}th,td{border:1px solid #e5e7eb;padding:6px 8px}th{background:#f9fafb;text-align:center;font-size:9px;font-weight:700;color:#374151}td{text-align:right}td:nth-child(1),td:nth-child(2),td:nth-child(3){text-align:left}.total td{font-weight:bold;background:#f3f4f6;color:#111827}.bank{margin-top:20px;padding:12px;border:1px solid #e5e7eb;font-size:9.5px;background:#f8fafc;border-radius:6px;line-height:1.6}@media print{body{margin:20px}}</style></head><body>${getLH()}<h2>${b.client} — ${b.month} MONTHLY BILL (${b.id})</h2><div class="info"><span><b>Period:</b> ${b.from} — ${b.to}</span><span><b>Crew:</b> ${(b.crew||[]).length} &nbsp;|&nbsp; <b>Date:</b> ${b.date||''}</span></div><table><thead><tr><th>#</th><th>Name</th><th>Sign On</th><th>Wages/M</th><th>From</th><th>To</th><th>Days Board</th><th>Days/M</th><th>Actual HA</th><th>POB</th><th>Bonus</th><th>PDE</th><th>VISA</th><th>WG</th><th>Total</th><th>Remark</th></tr></thead><tbody>${trs}</tbody><tfoot><tr class="total"><td colspan="14" style="text-align:right">TOTAL USD</td><td>${(b.total||0).toFixed(2)}</td><td></td></tr></tfoot></table><div class="bank"><b>BANK REMITTANCE DETAILS:</b><br/>Account No: ${b.bankInfo?.accNo} | Account Name: ${b.bankInfo?.accName} | Bank: ${b.bankInfo?.bankName} | SWIFT: <b>${b.bankInfo?.swift}</b><br/>REMARK: ${b.bankInfo?.remark || "Manning fee calculated upon 30 days, no overlap"}</div></body></html>`; const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400); };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Generate Monthly Bill</h4><div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Client</label><select value={sc} onChange={e => setSc(e.target.value)} style={inp}><option value="">Select</option><option value="Mr.Xing & Mr.Zhong">Mr.Xing & Mr.Zhong</option><option value="CHH (All)">CHH (All)</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Month</label><div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}><input type="month" value={mo} onChange={e => setMo(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }} style={{...inp, paddingRight: 24, cursor: "pointer" }} /><span style={{ position: "absolute", right: 8, pointerEvents: "none", color: C.txM, fontSize: 9 }}>▼</span></div></div><Btn onClick={gen} disabled={!sc}>Generate</Btn></div></div>
    {!bills.length ? <div style={{ textAlign: "center", padding: 30, color: C.txD }}>No bills yet.</div> : bills.slice().reverse().map(b => <div key={b.id} style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, color: C.acc, fontSize: 13 }}>{b.id}</span><Badge t={b.status} c={b.status === "Paid" ? "green" : b.status === "Sent" ? "blue" : "yellow"} /></div>        <div style={{ display: "flex", gap: 5 }}>
          {b.status === "Draft" && <Btn v="pri" onClick={() => setSt(b.id, "Sent")}>Send</Btn>}
          {b.status === "Sent" && <Btn v="wrn" onClick={() => setSt(b.id, "Draft")}>Revise</Btn>}
          <Btn v="ghost" onClick={() => exportCSV(b)} s={{ fontSize: 11 }}>📊 Download Excel</Btn>
          <Btn v="ghost" onClick={() => exportPDF(b)} s={{ fontSize: 11 }}>📄 PDF Version</Btn>
          <Btn v="sec" onClick={() => setVb(vb === b.id ? null : b.id)}>{vb === b.id ? "Hide" : "Details"}</Btn>
        </div>
      </div>
      <div style={{ background: C.bg, borderRadius: 6, padding: "8px 12px", border: `1px solid ${C.bdr}` }}><div style={{ fontSize: 13, fontWeight: 700, color: C.acc, marginBottom: 4 }}>{b.client} {(b.month || "").split("-").reverse().join("'")} BILL</div><div style={{ display: "flex", gap: 16, fontSize: 11, color: C.txM, flexWrap: "wrap" }}><span>Period: <b style={{ color: C.txt }}>{b.from} — {b.to}</b></span><span>Crew: <b style={{ color: C.txt }}>{(b.crew || []).length}</b></span><span>Total: <b style={{ color: C.ok, fontSize: 12.5 }}>${(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</b></span></div></div>
      {vb === b.id && <div style={{ overflowX: "auto", borderRadius: 5, border: `1px solid ${C.bdr}`, marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              {b.status === "Draft" && <th style={{ ...thS, width: 30 }}></th>}
              {["Name", "Sign On Date", "Wages/M", "From", "To", "Days on Board", "Days of Month", "Actual HA", "POB", "Bonus", "PDE Fees", "VISA FEES", "WG", "Total Payment", "Remark"].map(h => <th key={h} style={{ ...thS, fontSize: 9, padding: "6px 4px" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(b.crew || []).map((c, i) => (
              <tr key={c.id || i}>
                {b.status === "Draft" && (
                  <td style={{ ...tdS, textAlign: "center", padding: "2px 4px" }}>
                    <Btn v="ghost" onClick={(e) => { e.stopPropagation(); remC(b.id, c.id || c.name, c.name); }} s={{ color: C.wrn, padding: "2px 5px", fontSize: 11, minWidth: "auto" }}>✕</Btn>
                  </td>
                )}
                <td style={{ ...tdS, fontWeight: 500 }}>{c.name}</td>
                <td style={tdS}>{c.joinDate || "—"}</td>
                <td style={{ ...tdS, textAlign: "right" }}>{(c.ownerPaid || 0).toLocaleString()}</td>
                <td style={tdS}>{c.from || b.from}</td>
                <td style={tdS}>{c.to || b.to}</td>
                {b.status === "Draft" ? (
                  <>
                    <td style={tdS}><input type="number" min="0" max={c.daysOfMonth} value={c.daysOnBoard ?? ""} onChange={e => upL(b.id, c.id || c.name, "daysOnBoard", e.target.value)} style={{ ...fi, color: c.daysOnBoard < c.daysOfMonth ? C.wrn : C.txt, fontWeight: c.daysOnBoard < c.daysOfMonth ? 700 : 400, width: 45 }} /></td>
                    <td style={{ ...tdS, textAlign: "center" }}>{c.daysOfMonth}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: C.inf }}>{(c.actualHA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={tdS}><input type="number" value={c.pob || ""} onChange={e => upL(b.id, c.id || c.name, "pob", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.bonus || ""} onChange={e => upL(b.id, c.id || c.name, "bonus", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.pdeFees || ""} onChange={e => upL(b.id, c.id || c.name, "pdeFees", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.visaFees || ""} onChange={e => upL(b.id, c.id || c.name, "visaFees", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.workingGear || ""} onChange={e => upL(b.id, c.id || c.name, "workingGear", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.acc }}>{(c.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={tdS}><input value={c.billRemark || ""} onChange={e => upL(b.id, c.id || c.name, "billRemark", e.target.value)} style={{ ...fi, width: 90, textAlign: "left" }} placeholder="—" /></td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdS, textAlign: "center", color: c.daysOnBoard < c.daysOfMonth ? C.wrn : C.txt, fontWeight: c.daysOnBoard < c.daysOfMonth ? 700 : 400 }}>{c.daysOnBoard}</td>
                    <td style={{ ...tdS, textAlign: "center" }}>{c.daysOfMonth}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 600 }}>{(c.actualHA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.pob || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.bonus || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.pdeFees || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.visaFees || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.workingGear || "—"}</td>
                    <td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.acc }}>{(c.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, fontSize: 10, color: C.txD }}>{c.billRemark || "—"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: C.bg }}>
              <td colSpan={b.status === "Draft" ? 8 : 7} style={{ ...tdS, textAlign: "right", fontWeight: 700 }}>TOTAL</td>
              <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: C.acc }}>{(b.totalHA || b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td colSpan={5}></td>
              <td style={{ ...tdS, textAlign: "right", fontWeight: 700, fontSize: 12, color: C.ok }}>{(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>}
      {vb === b.id && b.bankInfo && <div style={{ background: C.bg, borderRadius: 5, padding: 12, border: `1px solid ${C.bdr}`, marginTop: 8, fontSize: 10.5 }}>
        <div style={{ fontWeight: 600, color: C.txM, marginBottom: 8 }}>BANK REMITTANCE {b.status === "Draft" && <span style={{ color: C.inf, fontWeight: 400, marginLeft: 8 }}>(Editable in Draft)</span>}</div>
        {b.status === "Draft" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Account No</label><input value={b.bankInfo.accNo} onChange={e => upB(b.id, "accNo", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Account Name</label><input value={b.bankInfo.accName} onChange={e => upB(b.id, "accName", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Bank Name</label><input value={b.bankInfo.bankName} onChange={e => upB(b.id, "bankName", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>SWIFT</label><input value={b.bankInfo.swift} onChange={e => upB(b.id, "swift", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Remark</label><input value={b.bankInfo.remark} onChange={e => upB(b.id, "remark", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
          </div>
        ) : (
          <>
            <div>Acc: {b.bankInfo.accNo} | {b.bankInfo.accName} | {b.bankInfo.bankName} | SWIFT: <b>{b.bankInfo.swift}</b></div>
            <div style={{ color: C.txD, marginTop: 4 }}>REMARK: {b.bankInfo.remark || "Manning fee calculated upon 30 days, no overlap"}</div>
          </>
        )}
      </div>}
    </div>)}
      {confDel && (
        <Mod title="Confirm Removal" onClose={() => setConfDel(null)}>
          <div style={{ padding: 10, textAlign: "center" }}>
            <p style={{ marginBottom: 20, fontSize: 13 }}>Are you sure you want to remove <b>{confDel.name}</b> from this bill?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn v="sec" onClick={() => setConfDel(null)}>Cancel</Btn>
              <Btn v="err" onClick={execRemC}>Remove Crew</Btn>
            </div>
          </div>
        </Mod>
      )}
    </div>;
}

// ============== RECONCILIATION ==============
function ReconV({ bills, setBills, payments, setPayments, showT, fs, fsOk }) {
  const [pf, setPf] = useState({ billId: "", amount: "", ref: "", date: new Date().toISOString().split("T")[0], slipUrl: "" });
  const [res, setRes] = useState(null);
  const [ocrLd, setOcrLd] = useState(false);
  const [upLd, setUpLd] = useState(false);
  const [ocrMsg, setOcrMsg] = useState("");
  const sent = bills.filter(b => b.status === "Sent");
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  
  const handleOcr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!pf.billId) { showT("Please select a Bill first to verify the amount against.", "wrn"); return; }
    
    setOcrLd(true); setUpLd(true); setOcrMsg("Uploading & Scanning slip..."); setRes(null);
    try {
      const storagePath = `slips/${Date.now()}_${file.name}`;
      const url = await fsUploadFile(file, storagePath);
      if (url) setPf(prev => ({ ...prev, slipUrl: url }));
      setUpLd(false);

      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      const b = bills.find(x => x.id === pf.billId);
      if (!b) throw new Error("Bill not found.");
      
      const targetAmt = b.total;
      // Find all numbers in text
      const nums = text.match(/\d+[.,]?\d*/g);
      let foundMatch = false;
      let highestVal = 0;
      
      if (nums) {
        for (let str of nums) {
          const val = parseFloat(str.replace(/,/g, ""));
          if (!isNaN(val)) {
            if (val > highestVal) highestVal = val;
            if (Math.abs(val - targetAmt) < 0.01) {
              foundMatch = true; break;
            }
          }
        }
      }
      
      if (foundMatch) {
         setPf(prev => ({ ...prev, amount: String(targetAmt) }));
         setOcrMsg("✅ OCR Verified: Matching amount found in slip.");
         showT("OCR Match found!");
      } else {
         setOcrMsg(`❌ OCR Warning: Mismatch. Expected $${targetAmt.toLocaleString()}, largest number found was $${highestVal.toLocaleString()}.`);
         showT("OCR Amount Mismatch", "wrn");
      }
    } catch (err) {
      console.error(err);
      setOcrMsg("⚠️ OCR Error: Failed to process image.");
    }
    setOcrLd(false);
  };

  const rec = async () => { const bill = bills.find(b => b.id === pf.billId); if (!bill) return; const amt = Number(pf.amount); const diff = amt - bill.total;
    const pay = { id: `PAY-${String(payments.length + 1).padStart(3, "0")}`, billId: bill.id, client: bill.client, amount: amt, ref: pf.ref, date: pf.date, match: Math.abs(diff) < 0.01, diff, slipUrl: pf.slipUrl };
    setPayments([...payments, pay]); if (fsOk) fs.setD("payments", pay.id, pay);
    if (Math.abs(diff) < 0.01) { setBills(bills.map(b => b.id === bill.id ? { ...b, status: "Paid" } : b)); if (fsOk) fs.upD("bills", bill.id, { status: "Paid" }); setRes({ ok: true, msg: `Matches ${bill.id}. PAID.` }); showT("Matched!"); }
    else { setRes({ ok: false, msg: `Mismatch on ${bill.id}.`, diff }); showT("Mismatch", "wrn"); }
    setPf({ billId: "", amount: "", ref: "", date: new Date().toISOString().split("T")[0], slipUrl: "" }); setOcrMsg(""); };
    
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Record Payment & Bank Slip Verification</h4>{!sent.length ? <div style={{ color: C.txD, fontSize: 11.5 }}>No outstanding (Sent) bills.</div> : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>1. Select Bill</label><select value={pf.billId} onChange={e => { const b = bills.find(x => x.id === e.target.value); setPf({ ...pf, billId: e.target.value, amount: b ? String(b.total) : "" }); setOcrMsg(""); }} style={inp}><option value="">Select</option>{sent.map(b => <option key={b.id} value={b.id}>{b.id}-{b.client}</option>)}</select></div>
    <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>2. Upload Bank Slip for OCR Validation</label><div style={{ display: "flex", gap: 8 }}><input type="file" accept="image/*" onChange={handleOcr} style={{...inp, flex: 1}} disabled={!pf.billId || ocrLd} /></div></div>
    {pf.slipUrl && <div style={{ gridColumn: "1/-1", marginBottom: 8 }}><div style={{ fontSize: 10, color: C.txM, marginBottom: 4 }}>Slip Preview:</div><img src={pf.slipUrl} alt="Slip Preview" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 6, border: `1px solid ${C.bdr}`, cursor: "pointer" }} onClick={() => window.open(pf.slipUrl, "_blank")} /></div>}
    {ocrMsg && <div style={{ gridColumn: "1/-1", fontSize: 11, padding: 8, borderRadius: 5, background: ocrMsg.includes("✅") ? C.okB : (ocrMsg.includes("❌") ? C.wrnB : C.bg), color: ocrMsg.includes("✅") ? C.ok : (ocrMsg.includes("❌") ? C.wrn : C.txM), border: `1px solid ${ocrMsg.includes("✅") ? C.ok : (ocrMsg.includes("❌") ? C.wrn : C.bdr)}` }}>{ocrLd ? (upLd ? "Uploading Attachment..." : "Scanning Image...") : ocrMsg}</div>}
    <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>3. Amount</label><input type="number" value={pf.amount} onChange={e => setPf({ ...pf, amount: e.target.value })} style={inp} /></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Ref</label><input value={pf.ref} onChange={e => setPf({ ...pf, ref: e.target.value })} style={inp} /></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Date</label><input type="date" value={pf.date} onChange={e => setPf({ ...pf, date: e.target.value })} style={inp} /></div><div style={{ gridColumn: "1/-1", marginTop: 8 }}><Btn onClick={rec} disabled={!pf.billId || !pf.amount || upLd}>Reconcile & Create Resulting Slips</Btn></div></div>}</div>
        {res && <div style={{ background: res.ok ? C.okB : C.wrnB, border: `1px solid ${res.ok ? C.ok : C.wrn}33`, borderRadius: 7, padding: 12, marginBottom: 14 }}>
      <div style={{ fontWeight: 600, color: res.ok ? C.ok : C.wrn }}>{res.ok ? "MATCH" : "MISMATCH"} - {res.msg}</div>
      {res.diff != null && !res.ok && (
        <>
          <div style={{ fontWeight: 700, color: C.wrn, marginTop: 3 }}>Difference: ${Math.abs(res.diff).toLocaleString()}</div>
          <div style={{ fontSize: 10, color: C.txD, marginTop: 6, lineHeight: 1.4 }}>
            <b>Tip:</b> If the owner intentionally paid a different amount (e.g. refused certain crew fees), please <b>Revise</b> the bill in the Monthly Billing tab to match the receipt before reconciling.
          </div>
        </>
      )}
    </div>}
    {payments.length > 0 && <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["ID", "Bill", "Client", "Amount", "Ref", "Date", "Status", "Slip"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{payments.slice().reverse().map(p => <tr key={p.id}><td style={tdS}><span style={{ fontWeight: 600, color: C.acc }}>{p.id}</span></td><td style={tdS}>{p.billId}</td><td style={tdS}>{p.client}</td><td style={tdS}>${(p.amount || 0).toLocaleString()}</td><td style={tdS}>{p.ref}</td><td style={tdS}>{p.date}</td><td style={tdS}><Badge t={p.match ? "Matched" : "Mismatch"} c={p.match ? "green" : "red"} /></td><td style={tdS}>{p.slipUrl ? <Btn v="ghost" onClick={() => window.open(p.slipUrl, "_blank")} s={{ fontSize: 10, padding: "2px 6px" }}>👁️ View</Btn> : "—"}</td></tr>)}</tbody></table></div>}
  </div>;
}

// ============== SLIP UPLOAD ==============
function SlipV({ crew, payments, slips, setSlips, showT, fs, fsOk }) {
  const [sp, setSp] = useState(""); const [sc, setSc] = useState([]);
  const mt = payments.filter(p => p.match); const py = payments.find(p => p.id === sp);
  const assignedCrewIds = py ? slips.filter(s => s.payId === sp).flatMap(s => s.crewIds || []) : [];
  const ac = py ? (py.client === "Mr.Xing & Mr.Zhong" ? crew.filter(c => c.client === "XING" || c.client === "MR.ZHONG") : (py.client === "CHH (All)" ? crew.filter(c => c.client && c.client.startsWith("CHH")) : crew.filter(c => c.client === py.client))) : [];
  const cc = ac.filter(c => !assignedCrewIds.includes(c.id));
  const assignedCount = ac.length - cc.length;
  const tg = id => setSc(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  const up = () => { if (!sp || !sc.length) return; const sl = { id: `SLIP-${String(slips.length + 1).padStart(3, "0")}`, payId: sp, client: py.client, crewIds: [...sc], date: new Date().toISOString().split("T")[0] }; setSlips([...slips, sl]); if (fsOk) fs.setD("slips", sl.id, sl); showT(`Assignment ${sl.id} confirmed`); setSp(""); setSc([]); };
  const delSlip = async (id) => { setSlips(slips.filter(s => s.id !== id)); if (fsOk) await fs.delD("slips", id); showT(`Slip ${id} deleted`, "wrn"); };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 3px", fontSize: 12.5, fontWeight: 600 }}>Salary Assignment</h4><p style={{ fontSize: 10.5, color: C.txD, margin: "0 0 10px" }}>Assign verified payments to individual crew members.</p>{!mt.length ? <div style={{ color: C.txD, fontSize: 11.5 }}>No matched payments yet.</div> : <>      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Payment</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={sp} onChange={e => { setSp(e.target.value); setSc([]); }} style={{ ...inp, maxWidth: 400 }}>
            <option value="">Select</option>
            {mt.map(p => <option key={p.id} value={p.id}>{p.id}-{p.client}</option>)}
          </select>
          {py && py.slipUrl && <Btn v="ghost" onClick={() => window.open(py.slipUrl, "_blank")} s={{ fontSize: 10, padding: "5px 10px" }}>👁️ View Original Slip</Btn>}
        </div>
      </div>
      {sp && <div style={{ fontSize: 10.5, color: C.inf, marginBottom: 8 }}>{assignedCount} crew already assigned to slips for this payment.</div>}{sp && cc.length === 0 && assignedCount > 0 && <div style={{ padding: 10, background: C.okB, color: C.ok, borderRadius: 5, fontSize: 11 }}>All crew members for this payment have been assigned.</div>}{sp && cc.length > 0 && <><div style={{ display: "flex", gap: 4, marginBottom: 8 }}><Btn v="ghost" onClick={() => setSc(cc.map(c => c.id))}>All</Btn><Btn v="ghost" onClick={() => setSc([])}>Clear</Btn></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 5, marginBottom: 10, maxHeight: 300, overflow: "auto" }}>{cc.map(c => { const sel = sc.includes(c.id); return <div key={c.id} onClick={() => tg(c.id)} style={{ padding: "6px 8px", borderRadius: 5, cursor: "pointer", background: sel ? C.priG : C.bg, border: `1px solid ${sel ? C.pri : C.bdr}`, display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${sel ? C.pri : C.txD}`, background: sel ? C.pri : "transparent", flexShrink: 0 }} /><div><div style={{ fontSize: 11.5, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 9.5, color: C.txD }}>{c.rank} · {c.vessel}</div></div></div>; })}</div><Btn onClick={up} disabled={!sc.length}>Confirm Assignment ({sc.length} crew)</Btn></>}</>}</div>
    {slips.length > 0 && slips.slice().reverse().map(sl => <div key={sl.id} style={{ background: C.card, borderRadius: 7, border: `1px solid ${C.bdr}`, padding: 12, marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontWeight: 700, color: C.acc }}>{sl.id}</span><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 10, color: C.txD }}>{sl.date}</span><button onClick={() => delSlip(sl.id)} style={{ background: "transparent", border: "none", color: C.wrn, cursor: "pointer", fontSize: 10 }}>Delete</button></div></div><div style={{ fontSize: 11.5, color: C.txM, marginBottom: 5 }}>Pay: {sl.payId} · {sl.client}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{(sl.crewIds || []).map(cid => { const c = crew.find(cr => cr.id === cid); return c ? <span key={cid} style={{ background: C.okB, color: C.ok, padding: "2px 6px", borderRadius: 3, fontSize: 10 }}>{c.name}</span> : null; })}</div></div>)}
  </div>;
}

// ============== DISTRIBUTION ==============
function DistV({ crew, slips, crewPay, setCrewPay, showT, fs, fsOk, userRole, payments, bills }) {
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  
  const exportPayrollPDF = (calc, rate, extra, crew) => {
    const trs = calc.payments.map((p, i) => {
        const c = crew.find(cr => cr.id === p.crewId) || {};
        const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
        const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
        return `<tr>
          <td>${i+1}</td>
          <td><b>${c.name}</b><br><small>${c.rank}</small></td>
          <td>${c.bankName || "CASH"}<br><small>${c.bankAccNo || ""}</small></td>
          <td>$${(p.total || 0).toLocaleString()}</td>
          <td>${ex.bc.toLocaleString()}</td>
          <td>${ex.ref.toLocaleString()}</td>
          <td>${ex.ded.toLocaleString()}</td>
          <td style="font-weight:bold; color:#10B981">${mmk.toLocaleString()}</td>
          <td>${c.allotmentType || "bank"}</td>
        </tr>`;
    }).join("");

    const html = `<html><head><title>Payroll-${calc.bill.id}</title><style>
        body { font-family: sans-serif; padding: 30px; font-size: 11px; }
        h2 { margin: 0 0 10px; color: #2563EB; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .summary { margin: 15px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; gap: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
        th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; color: #475569; }
        .total { font-weight: bold; background: #f8fafc; }
        .footer { margin-top: 60px; display: flex; justify-content: space-between; padding: 0 40px; }
        .sig { text-align:center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 8px; color: #64748b; font-size: 10px; }
    </style></head><body>
      ${getLH()}
      <h2>PAYROLL SUMMARY: ${calc.vessel}</h2>
      <div class="summary">
        <span><b>Bill ID:</b> ${calc.bill.id}</span>
        <span><b>Month:</b> ${calc.bill.month}</span>
        <span><b>Exchange Rate:</b> 1 USD = ${rate.toLocaleString()} MMK</span>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Staff Name</th><th>Bank Info</th><th>USD Amt</th><th>Bank Chg</th><th>Refund</th><th>Deduction</th><th>Net MMK</th><th>Type</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
      <div class="footer">
        <div class="sig">Prepared By (Accountant)</div>
        <div class="sig">Approved By (Director)</div>
      </div>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const exportBankPDF = (calc, rate, extra, crew) => {
    const banks = calc.payments.filter(p => {
        const c = crew.find(cr => cr.id === p.crewId) || {};
        return (c.allotmentType || "bank") === "bank";
    });
    const trs = banks.map((p, i) => {
        const c = crew.find(cr => cr.id === p.crewId) || {};
        const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
        const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
        return `<tr>
          <td>${i+1}</td>
          <td><b>${c.bankAccName || c.name}</b></td>
          <td>${c.bankAccNo || "-"}</td>
          <td>${c.bankName || "-"}</td>
          <td style="font-weight:bold; text-align:right">${mmk.toLocaleString()}</td>
          <td>MMK</td>
        </tr>`;
    }).join("");

    const html = `<html><head><title>BankList-${calc.bill.id}</title><style>
        body { font-family: sans-serif; padding: 30px; font-size: 12px; line-height: 1.5; }
        h2 { text-decoration: underline; text-align: center; margin-bottom: 25px; color: #1e3a8a; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 10px 12px; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 11px; }
        .footer { margin-top: 60px; text-align: right; font-size: 11px; padding-right: 20px; }
    </style></head><body>
      ${getLH()}
      <h2>BANK REMITTANCE LIST: ${calc.vessel} (${calc.bill.month})</h2>
      <table>
        <thead><tr><th>#</th><th>Account Name</th><th>Account No.</th><th>Bank</th><th style="text-align:right">Amount</th><th>CCY</th></tr></thead>
        <tbody>${trs}</tbody>
      </table>
      <div class="footer">
        <br/><br/>
        __________________________<br/>
        Authorized Signature
      </div>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const exportCashPDF = (calc, rate, extra, crew) => {
    const cash = calc.payments.filter(p => {
        const c = crew.find(cr => cr.id === p.crewId) || {};
        return (c.allotmentType || "bank") === "cash";
    });
    const trs = cash.map((p, i) => {
        const c = crew.find(cr => cr.id === p.crewId) || {};
        const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
        const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
        return `<tr>
          <td>${i+1}</td>
          <td><b>${c.name}</b></td>
          <td>${c.rank}</td>
          <td style="font-weight:bold; text-align:right">${mmk.toLocaleString()}</td>
          <td style="height: 40px; width: 150px;"></td>
        </tr>`;
    }).join("");

    const html = `<html><head><title>CashList-${calc.bill.id}</title><style>
        body { font-family: sans-serif; padding: 30px; font-size: 12px; }
        h2 { text-decoration: underline; text-align: center; margin-bottom: 25px; color: #1e3a8a; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 12px; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 11px; }
    </style></head><body>
      ${getLH()}
      <h2>CASH PAYMENT LIST: ${calc.vessel} (${calc.bill.month})</h2>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Rank</th><th style="text-align:right">Amount (MMK)</th><th>Signature</th></tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // IDs that already have a crewPayment record (any status)
  const processedIds = new Set(crewPay.map(p => p.crewId));

  // Slips that still have unprocessed crew
  const pendingSlips = slips.filter(s => (s.crewIds || []).some(id => !processedIds.has(id)));

  // Payments waiting for admin approval
  const awaitingApproval = crewPay.filter(p => p.status === "Pending Approval");
  const paidPayments     = crewPay.filter(p => p.status === "Paid");
  const [calc, setCalc] = useState(null); // Selected bill for report
  const [rate, setRate] = useState(3985);
  const [extra, setExtra] = useState({}); // { crewId: { bc, ref, ded } }

  // Group paid payments by Bill/Vessel for reporting
  const payrolls = bills.map(b => {
    const pay = payments.find(p => p.billId === b.id);
    if (!pay) return null;
    const sls = slips.filter(s => s.payId === pay.id);
    const cPays = paidPayments.filter(p => sls.some(s => s.id === p.slipId));
    if (!cPays.length) return null;
    return { bill: b, payments: cPays, clientName: b.client };
  }).filter(Boolean);

  // Accountant: process slip → status "Pending Approval"
  const proc = async (sl) => {
    // Look up the bill via payment
    const payment = payments.find(p => p.id === sl.payId);
    const bill = payment ? bills.find(b => b.id === payment.billId) : null;

    const newPays = (sl.crewIds || [])
      .filter(id => !processedIds.has(id))
      .map((cid, i) => {
        const c = crew.find(cr => cr.id === cid);
        if (!c) return null;
        
        let actualPayment = c.ownerPaid || 0;
        if (bill && bill.crew) {
          const billCrew = bill.crew.find(bc => bc.id === cid);
          if (billCrew && billCrew.totalPayment !== undefined) {
             actualPayment = billCrew.totalPayment;
          }
        }

        return {
          id: `CPAY-${String(crewPay.length + i + 1).padStart(3, "0")}`,
          crewId: cid, crewName: c.name, slipId: sl.id,
          vessel: c.vessel || (bill && bill.vessel) || "Unknown",
          slipUrl: (payment && payment.slipUrl) || "",
          total: actualPayment, bankAmount: actualPayment, cashAmount: 0,
          type: c.allotment?.type || "bank",
          status: "Pending Approval",
          date: new Date().toISOString().split("T")[0],
        };
      }).filter(Boolean);
    setCrewPay([...crewPay, ...newPays]);
    if (fsOk) fs.batchW("crewPayments", newPays);
    showT(`${newPays.length} payments submitted — awaiting admin approval`, "wrn");
  };

  // Admin: approve a single payment
  const approve = async (payId) => {
    setCrewPay(crewPay.map(p => p.id === payId ? { ...p, status: "Paid", approvedAt: new Date().toISOString() } : p));
    if (fsOk) fs.upD("crewPayments", payId, { status: "Paid", approvedAt: new Date().toISOString() });
    showT("Payment approved ✓");
  };

  // Admin: approve all pending at once
  const approveAll = async () => {
    const now = new Date().toISOString();
    const updated = crewPay.map(p => p.status === "Pending Approval" ? { ...p, status: "Paid", approvedAt: now } : p);
    setCrewPay(updated);
    if (fsOk) {
      for (const p of awaitingApproval) {
        await fs.upD("crewPayments", p.id, { status: "Paid", approvedAt: now });
      }
    }
    showT(`${awaitingApproval.length} payments approved ✓`);
  };

  return <div>
    {/* ── Accountant: Process Slips ── */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}>
      <h4 style={{ margin: "0 0 3px", fontSize: 12.5, fontWeight: 600 }}>Payment Distribution</h4>
      <p style={{ fontSize: 10.5, color: C.txD, margin: "0 0 10px" }}>
        {userRole === "admin"
          ? "Review and approve crew salary payments."
          : "Process crew payments from uploaded slips. Payments require Admin approval before finalizing."}
      </p>
      {!pendingSlips.length
        ? <div style={{ color: C.txD, fontSize: 11.5 }}>{slips.length ? "All slips processed." : "No slips uploaded yet."}</div>
        : pendingSlips.map(sl => {
            const pendingCrew = (sl.crewIds || []).filter(id => !processedIds.has(id));
            return <div key={sl.id} style={{ background: C.bg, borderRadius: 6, padding: 10, marginBottom: 6, border: `1px solid ${C.bdr}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><span style={{ fontWeight: 600, color: C.acc }}>{sl.id}</span> · {sl.client} · {pendingCrew.length} crew</span>
                <Btn v="ok" onClick={() => proc(sl)}>Submit for Approval</Btn>
              </div>
            </div>;
          })
      }
    </div>

    {/* ── Admin: Approval Queue ── */}
    {userRole === "admin" && awaitingApproval.length > 0 && (
      <div style={{ background: `${C.wrn}10`, borderRadius: 8, border: `1px solid ${C.wrn}40`, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.wrn }}>⏳ Pending Approval ({awaitingApproval.length})</h4>
            <p style={{ margin: "3px 0 0", fontSize: 10.5, color: C.txD }}>Review and confirm each payment before finalizing.</p>
          </div>
          <Btn v="ok" onClick={approveAll}>✓ Approve All</Btn>
        </div>
        <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Crew Name", "Slip", "Receipt", "Amount", "Type", "Date", "Action"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{awaitingApproval.map(p => (
              <tr key={p.id} style={{ background: `${C.wrn}05` }}>
                <td style={tdS}><span style={{ fontWeight: 600 }}>{p.crewName}</span></td>
                <td style={tdS}>{p.slipId}</td>
                <td style={tdS}>
                  {p.slipUrl ? <Btn v="ghost" onClick={() => window.open(p.slipUrl, "_blank")} s={{ fontSize: 10, padding: "2px 6px" }}>👁️ Slip</Btn> : "—"}
                </td>
                <td style={{ ...tdS, fontWeight: 600, color: C.acc }}>${(p.total || 0).toLocaleString()}</td>
                <td style={tdS}>{p.type}</td>
                <td style={{ ...tdS, color: C.txD }}>{p.date}</td>
                <td style={tdS}><Btn v="ok" s={{ fontSize: 10, padding: "3px 10px" }} onClick={() => approve(p.id)}>Approve</Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    )}

    {/* ── Paid Payments History ── */}
    {/* ── Payroll Reporting ── */}
    {payrolls.length > 0 && <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginTop: 14 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>🖨️ Payroll Reporting</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {payrolls.map(pr => (
          <div key={pr.bill.id} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 6, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{pr.clientName} · {pr.bill.month}</div>
              <div style={{ fontSize: 9, color: C.txD }}>{pr.payments.length} crew · Bill: {pr.bill.id}</div>
            </div>
            <Btn v="ghost" s={{ fontSize: 10 }} onClick={async () => {
                setCalc(pr);
                if (fsOk) {
                    const saved = await fs.getD("payrollSettings", pr.bill.id);
                    if (saved) {
                        setRate(saved.rate || 3985);
                        setExtra(saved.extraSettings || {});
                        showT("Loaded saved payroll settings");
                    } else {
                        setRate(3985);
                        setExtra({});
                    }
                }
            }}>Report</Btn>
          </div>
        ))}
      </div>
    </div>}

    {/* ── Payroll Calculation Modal ── */}
    {calc && <Mod title={`Payroll Summary: ${calc.clientName} (${calc.bill.month})`} onClose={() => setCalc(null)} w={950}>
      <div style={{ marginBottom: 15, display: "flex", gap: 20, alignItems: "center", background: C.bg, padding: 10, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
        <div>
          <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Exchange Rate (MMK/USD)</label>
          <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} style={{ ...inp, width: 120 }} />
        </div>
        <div style={{ fontSize: 11, color: C.txD }}>
          Calculates MMK totals and groups Bank/Cash lists.
        </div>
      </div>
      
      <div style={{ overflowX: "auto", maxHeight: 400, border: `1px solid ${C.bdr}`, borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
          <thead style={{ position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
            <tr>{["Name", "Vessel", "Rank", "Remittance(USD)", "Bank Chg(MMK)", "Refunds(MMK)", "Ded.(MMK)", "Remittance(MMK)", "Type"].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {calc.payments.map(p => {
              const c = crew.find(cr => cr.id === p.crewId) || {};
              const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
              const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
              const updateExtra = (k, v) => setExtra({ ...extra, [p.crewId]: { ...ex, [k]: Number(v) } });
              
              return <tr key={p.id}>
                <td style={tdS}><b>{c.name}</b></td>
                <td style={tdS}>{c.vessel || "Unknown"}</td>
                <td style={tdS}>{c.rank}</td>
                <td style={{ ...tdS, fontWeight: 600 }}>${(p.total || 0).toLocaleString()}</td>
                <td style={tdS}><input type="number" value={ex.bc} onChange={e => updateExtra("bc", e.target.value)} style={{ ...inp, padding: "2px 5px", fontSize: 10 }} /></td>
                <td style={tdS}><input type="number" value={ex.ref} onChange={e => updateExtra("ref", e.target.value)} style={{ ...inp, padding: "2px 5px", fontSize: 10 }} /></td>
                <td style={tdS}><input type="number" value={ex.ded} onChange={e => updateExtra("ded", e.target.value)} style={{ ...inp, padding: "2px 5px", fontSize: 10 }} /></td>
                <td style={{ ...tdS, fontWeight: 700, color: C.pri }}>{mmk.toLocaleString()}</td>
                <td style={tdS}><Badge t={c.allotmentType || "bank"} c={c.allotmentType === "cash" ? "orange" : "blue"} /></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 15 }}>
        <Btn v="ghost" onClick={async () => {
             // Save current batch settings to Firestore
             const batchData = {
                billId: calc.bill.id,
                vessel: calc.vessel,
                month: calc.bill.month,
                rate: rate,
                extraSettings: extra,
                finalizedAt: new Date().toISOString()
             };
             if (fsOk) await fs.setD("payrollSettings", calc.bill.id, batchData);
             showT("Payroll settings saved ✓");
        }}>💾 Save Rate</Btn>
        {(() => {
          const hasBank = calc.payments.some(p => (crew.find(cr => cr.id === p.crewId)?.allotmentType || "bank") === "bank");
          const hasCash = calc.payments.some(p => (crew.find(cr => cr.id === p.crewId)?.allotmentType) === "cash");
          return <>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn v="ghost" s={{ fontSize: 10 }} onClick={() => exportPayrollPDF(calc, rate, extra, crew)}>📄 PDF Version</Btn>
              <Btn v="sec" onClick={() => {
                  const rows = calc.payments.map(p => {
                    const c = crew.find(cr => cr.id === p.crewId) || {};
                    const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
                    const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
                    return { 
                      No: c.no, Rank: c.rank, Name: c.name, 
                      "Remittance (USD)": p.total, "Bank Chg (MMK)": ex.bc, 
                      "Refunds (MMK)": ex.ref, "Office Ded. (MMK)": ex.ded, 
                      "Remittance (MMK)": mmk, "Type": c.allotmentType || "bank" 
                    };
                  });
                  downloadCSV(rows, `Payroll_Summary_${calc.vessel}_${calc.bill.month}.csv`);
                  showT("Summary Downloaded");
              }}>Download Excel (CSV)</Btn>
            </div>
            {hasBank && <div style={{ display: "flex", gap: 10 }}>
              <Btn v="ghost" s={{ fontSize: 10 }} onClick={() => exportBankPDF(calc, rate, extra, crew)}>📄 Bank PDF</Btn>
              <Btn v="ok" onClick={() => {
                  const rows = calc.payments.filter(p => {
                      const c = crew.find(cr => cr.id === p.crewId) || {};
                      return (c.allotmentType || "bank") === "bank";
                  }).map(p => {
                      const c = crew.find(cr => cr.id === p.crewId) || {};
                      const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
                      return { 
                        Rank: c.rank, Name: c.name, 
                        "Bank Account Name": c.bankAccName, 
                        "MMK Account No.": c.bankAccNo, 
                        "Bank": c.bankName,
                        "Total (MMK)": (p.total * rate) - ex.bc + ex.ref - ex.ded 
                      };
                  });
                  downloadCSV(rows, `Bank_List_${calc.vessel}_${calc.bill.month}.csv`);
                  showT("Bank List Downloaded");
              }}>Download Bank Excel</Btn>
            </div>}
            {hasCash && <div style={{ display: "flex", gap: 10 }}>
              <Btn v="ghost" s={{ fontSize: 10 }} onClick={() => exportCashPDF(calc, rate, extra, crew)}>📄 Cash PDF</Btn>
              <Btn v="wrn" onClick={() => {
                  const rows = calc.payments.filter(p => {
                      const c = crew.find(cr => cr.id === p.crewId) || {};
                      return (c.allotmentType || "bank") === "cash";
                  }).map(p => {
                      const c = crew.find(cr => cr.id === p.crewId) || {};
                      const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
                      return { 
                        Rank: c.rank, Name: c.name, 
                        "Total Remittance (MMK)": (p.total * rate) - ex.bc + ex.ref - ex.ded 
                      };
                  });
                  downloadCSV(rows, `Cash_Pickup_List_${calc.vessel}_${calc.bill.month}.csv`);
                  showT("Cash List Downloaded");
              }}>Download Cash Excel</Btn>
            </div>}
          </>;
        })()}
      </div>
    </Mod>}
  </div>;
}


// ============== STATUS BOARD ==============
function BoardV({ crew, crewPay, slips, payments, bills, fN, setFN, fV, setFV, fC, setFC, vessels, clients, selectedMonth, setSelectedMonth }) {
  // Filter by selected salary month
  const mBills = bills.filter(b => b.month === selectedMonth);
  const mBillIds = new Set(mBills.map(b => b.id));
  const mPayIds = new Set(payments.filter(p => mBillIds.has(p.billId)).map(p => p.id));
  const mSlips = slips.filter(s => mPayIds.has(s.payId));
  const ss = new Set(mSlips.flatMap(s => s.crewIds || []));
  const ps = new Set(
    crewPay.filter(p => {
      const slip = slips.find(s => s.id === p.slipId);
      return slip && mPayIds.has(slip.payId) && p.status === "Paid";
    }).map(p => p.crewId)
  );

  const gS = c => ps.has(c.id) ? "Paid" : ss.has(c.id) ? "Slip Received" : "Pending";
  const fl = crew.filter(c => {
    if (fN && !c.name.toLowerCase().includes(fN.toLowerCase()) && !(c.id || "").toLowerCase().includes(fN.toLowerCase())) return false;
    if (fV && c.vessel !== fV) return false;
    if (fC && c.client !== fC) return false;
    return true;
  });
  const pd = fl.filter(c => gS(c) === "Paid").length;
  const sr = fl.filter(c => gS(c) === "Slip Received").length;
  const pn = fl.filter(c => gS(c) === "Pending").length;

  const [sy, sm] = selectedMonth.split("-").map(Number);
  const salaryMonthLabel = new Date(sy, sm - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const changeMonth = (delta) => {
    const d = new Date(sy, sm - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return <div>
    {/* Month selector */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ fontSize: 10, color: C.txD }}>SALARY MONTH:</div>
      <button onClick={() => changeMonth(-1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>‹</button>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }}
          style={{ background: "transparent", border: "none", color: C.acc, fontSize: 13, fontWeight: 700, cursor: "pointer", outline: "none", paddingRight: 16 }} />
        <span style={{ position: "absolute", right: 2, pointerEvents: "none", color: C.acc, fontSize: 9 }}>▼</span>
      </div>
      <button onClick={() => changeMonth(1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>›</button>
      <span style={{ fontSize: 10, color: C.txD, marginLeft: 4 }}>— {salaryMonthLabel} salary status</span>
    </div>

    <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
      {[["Paid", pd, C.ok, C.okB], ["Slip Rcv", sr, C.inf, C.infB], ["Pending", pn, C.wrn, C.wrnB]].map(([l, v, c, bg]) =>
        <div key={l} style={{ background: bg, border: `1px solid ${c}30`, borderRadius: 7, padding: "8px 14px", flex: "1 1 140px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
          <div style={{ fontSize: 10, color: c }}>{l}</div>
        </div>
      )}
    </div>
    <Filt {...{ fN, setFN, fV, setFV, fC, setFC, vessels, clients }} />
    <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["No", "ID", "Name", "Rank", "Vessel", "Client", "Wages/M", "Status"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
        <tbody>{fl.map(c => {
          const st = gS(c);
          const sc2 = st === "Paid" ? C.ok : st === "Slip Received" ? C.inf : C.wrn;
          return <tr key={c.id || c.no} style={{ background: `${sc2}06`, borderLeft: `3px solid ${sc2}` }}>
            <td style={tdS}>{c.no}</td>
            <td style={tdS}><span style={{ color: C.acc, fontWeight: 600 }}>{c.id}</span></td>
            <td style={tdS}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
            <td style={tdS}>{c.rank}</td>
            <td style={tdS}>{c.vessel || "—"}</td>
            <td style={tdS}>{c.client}</td>
            <td style={{ ...tdS, fontWeight: 600 }}>${(c.ownerPaid || 0).toLocaleString()}</td>
            <td style={tdS}><Badge t={st} c={st === "Paid" ? "green" : st === "Slip Received" ? "purple" : "yellow"} /></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
